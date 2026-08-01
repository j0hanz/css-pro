// Prepares text for rule matching. Comments and string literals are not code —
// rules that match inside them fire on prose; `/* avoid transition: all */` was
// blocking writes before this existed. Object-form CSS-in-JS and markup files are
// reduced to synthetic `x{ ... }` declaration blocks, because their CSS hides in
// quoted values and camelCase keys the rules could never match raw.

const blank = (s) => s.replace(/[^\n]/g, ' ');

// `//` is a comment in SCSS/Sass/Less and in JS, but NOT in plain CSS, where it can
// appear inside an unquoted url(). Only strip it where it means what we think.
const LINE_COMMENT_LANGS = /\.(scss|sass|less|[cm]?[jt]sx?)$/i;
const MARKUP_LANGS = /\.(html?|astro|vue|svelte)$/i;
// `<style lang="scss">` is SCSS, not CSS: `//` opens a comment there too.
const STYLE_LANG = /\blang\s*=\s*["']?(?:scss|sass|less)/i;

export function prepare(text, filePath = '') {
  if (MARKUP_LANGS.test(filePath)) return prepareMarkup(text);
  return prepareCode(stripComments(text, LINE_COMMENT_LANGS.test(filePath)));
}

// Markup prose is unquoted, so running rules on the whole file would fire on a
// paragraph that merely discusses `transition: all`. Only <style>, <script>, astro
// frontmatter, and style="" attributes hold CSS; everything else is dropped.
function prepareMarkup(text) {
  const src = text.replace(/<!--[\s\S]*?-->/g, blank);
  const parts = [];
  for (const m of src.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style/gi))
    parts.push(blankStrings(stripComments(m[2], STYLE_LANG.test(m[1]))));
  for (const m of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script/gi))
    parts.push(prepareCode(stripComments(m[1], true)));
  const frontmatter = src.match(/^---\r?\n([\s\S]*?)^---/m);
  if (frontmatter) parts.push(prepareCode(stripComments(frontmatter[1], true)));
  for (const m of src.matchAll(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const css = m[1] ?? m[2];
    if (css.trim()) parts.push(`x{ ${css} }`);
  }
  return parts.join('\n');
}

function prepareCode(code) {
  return [blankStrings(code), ...styleObjectBlocks(code)].join('\n');
}

// --- comments and strings -------------------------------------------------------

function stripComments(text, lineComments) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += blank(text.slice(i, stop));
      i = stop;
      continue;
    }
    // SCSS/Sass interpolation `#{...}` is not CSS: its `{`/`}` would read as block
    // delimiters and rule regexes would fire on the expression. Blank it like a
    // comment, newlines preserved. Depth-aware so nested `{}` inside the expression
    // (e.g. a map literal) does not terminate it early; strings inside are skipped.
    if (c === '#' && next === '{') {
      let depth = 1;
      let k = i + 2;
      while (k < text.length) {
        const ch = text[k];
        if (ch === '"' || ch === "'") {
          k = skipString(text, k);
          continue;
        }
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            k++;
            break;
          }
        }
        k++;
      }
      const stop = depth === 0 ? k : text.length;
      out += blank(text.slice(i, stop));
      i = stop;
      continue;
    }
    if (lineComments && c === '/' && next === '/') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? text.length : end;
      out += blank(text.slice(i, stop));
      i = stop;
      continue;
    }
    // Quoted strings pass through whole so `/*` inside them stays prose. Template
    // literals are NOT skipped: they carry the CSS in styled-components, and a
    // comment inside one is a CSS comment that must be stripped.
    if (c === '"' || c === "'") {
      const j = skipString(text, i);
      out += text.slice(i, j);
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// Template literal contents stay — they are real declarations. Quoted strings are
// content/urls: blank them. Newlines are preserved so whole-file checks stay meaningful.
function blankStrings(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      const j = skipString(text, i);
      const closed = j > i + 1 && text[j - 1] === c;
      out += c + blank(text.slice(i + 1, closed ? j - 1 : j)) + (closed ? c : '');
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// Returns the index just past the closing quote. An unterminated ' or " stops at the
// newline rather than swallowing the file; backticks may span lines.
function skipString(text, i) {
  const q = text[i];
  let j = i + 1;
  while (j < text.length && text[j] !== q) {
    if (text[j] === '\\') j += 2;
    else if (q !== '`' && text[j] === '\n') return j;
    else j++;
  }
  return j < text.length ? j + 1 : j;
}

// --- object-form CSS-in-JS ------------------------------------------------------
// style={{...}}, css={{...}}, sx={{...}}, style({...}), css({...}), keyframes({...}),
// createStyles({...}), styled.div({...}), styled('div')({...}). Each brace level
// becomes its own x{...} block, so sibling and nested objects cannot combine into
// declarations that were never adjacent.

// A key with a quoted or numeric value; anything computed (template literal, ternary,
// variable) is skipped — a value we cannot read is a rule we do not run.
const PAIR =
  /(?:"([^"\n]+)"|'([^'\n]+)'|([A-Za-z_$][\w$]*))\s*:\s*(?:"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|(-?(?:\d+\.?\d*|\.\d+)))/g;

function styleObjectBlocks(code) {
  // Built per call, not shared: scanObject drives lastIndex by hand, so a module-level
  // regex would carry a position into the next call.
  const region =
    /\b(?:(?:style|css|sx)\s*=\s*\{|(?:style|css|createStyles|keyframes)\s*\(|styled\s*(?:\.\w+|\(\s*["'][^"']*["']\s*\))\s*\()\s*\{/g;
  const blocks = [];
  while (region.exec(code)) {
    region.lastIndex = scanObject(code, region.lastIndex, blocks);
  }
  return blocks;
}

// Walks one object literal from just past its `{`, string-aware. Nested objects
// recurse into their own blocks and are excised from this level's text.
function scanObject(code, start, blocks) {
  let i = start;
  let flat = '';
  while (i < code.length) {
    const c = code[i];
    if (c === '"' || c === "'" || c === '`') {
      const j = skipString(code, i);
      flat += code.slice(i, j);
      i = j;
      continue;
    }
    if (c === '{') {
      i = scanObject(code, i + 1, blocks);
      continue;
    }
    if (c === '}') {
      i++;
      break;
    }
    flat += c;
    i++;
  }
  let decls = '';
  for (const p of flat.matchAll(PAIR)) {
    const key = p[3] ? p[3].replace(/[A-Z]/g, (u) => '-' + u.toLowerCase()) : (p[1] ?? p[2]);
    decls += `${key}: ${p[4] ?? p[5] ?? p[6]}; `;
  }
  if (decls) blocks.push(`x{ ${decls}}`);
  return i;
}
