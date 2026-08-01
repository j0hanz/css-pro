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

// `sink`, when given, receives one `{ at, source }` per appended synthetic block: `at`
// is where that block starts in the RETURNED string, `source` is where the object it
// was lifted from starts in `text`. Object-form declarations have no position in the
// source prefix, so without this a caller can only report them with no line — and a
// finding with no line is one no `csspro-ignore` marker can ever reach. Omitting the
// argument changes nothing: the returned string is identical either way, which is what
// keeps the blocking hook's behaviour fixed.
export function prepare(text, filePath = '', sink) {
  if (MARKUP_LANGS.test(filePath)) return prepareMarkup(text, sink);
  return prepareCode(stripComments(text, LINE_COMMENT_LANGS.test(filePath)), sink);
}

// Appends each block and records where it landed. Callers that pass no sink get the
// same string they always did.
function appendBlocks(head, blocks, sink) {
  let out = head;
  for (const b of blocks) {
    sink?.push({ at: out.length + 1, source: b.source });
    out += `\n${b.text}`;
  }
  return out;
}

// Markup prose is unquoted, so running rules on the whole file would fire on a
// paragraph that merely discusses `transition: all`. Only <style>, <script>, astro
// frontmatter, and style="" attributes hold CSS.
//
// Those regions are kept AT THEIR ORIGINAL OFFSETS and everything else is blanked,
// rather than extracted and joined. Joining discarded the offsets, so a defect on
// source line 6 was reported as line 2 — the audit's whole contract is `file:line`.
// Blanking is equivalent for matching (a rule cannot match whitespace) and keeps
// the original as a byte-identical-length prefix of the result.
//
// What cannot stay in place is object-form CSS-in-JS and style="" attributes: their
// declarations live in camelCase keys and quoted values that no rule matches raw, so
// they still become synthetic `x{ ... }` blocks appended past the source. Findings
// there report without a line, which is the honest answer — they have no single
// source position. Dropping those blocks instead would silently retire every
// block-scoped rule on a style attribute.
// Where a match's body sits in the source, measured backwards from the end of the
// match. One form for all three region kinds, and it stays right if the opening
// pattern is ever edited — measuring forwards means restating the open tag's length
// at each call site, and an offset that is wrong here does not fail loudly: it shifts
// every later region, and the overlap guard then drops one whole, leaving real CSS
// silently unchecked.
const contentStart = (m, body, closeLen) => m.index + m[0].length - body.length - closeLen;

function prepareMarkup(text, sink) {
  const src = text.replace(/<!--[\s\S]*?-->/g, blank);
  const regions = [];
  const extra = [];

  const frontmatter = src.match(/^---\r?\n([\s\S]*?)^---/m);
  if (frontmatter) {
    const code = stripComments(frontmatter[1], true);
    // Strings blanked in place exactly as in <script>: frontmatter is JS, and a quoted
    // value there is content, not a declaration. styleObjectBlocks still reads the
    // unblanked code — that is where those quoted values legitimately become CSS.
    const start = contentStart(frontmatter, code, '---'.length);
    regions.push({ start, code: blankStrings(code) });
    for (const b of styleObjectBlocks(code)) extra.push({ text: b.text, source: start + b.at });
  }
  for (const m of src.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style/gi))
    regions.push({
      start: contentStart(m, m[2], '</style'.length),
      code: blankStrings(stripComments(m[2], STYLE_LANG.test(m[1]))),
    });
  for (const m of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script/gi)) {
    const code = stripComments(m[1], true);
    const start = contentStart(m, m[1], '</script'.length);
    regions.push({ start, code: blankStrings(code) });
    for (const b of styleObjectBlocks(code)) extra.push({ text: b.text, source: start + b.at });
  }
  for (const m of src.matchAll(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const css = m[1] ?? m[2];
    if (css.trim()) extra.push({ text: `x{ ${css} }`, source: m.index });
  }

  let out = '';
  let at = 0;
  for (const r of regions.sort((a, b) => a.start - b.start)) {
    if (r.start < at) continue; // nested or overlapping — the outer region already covers it
    out += blank(src.slice(at, r.start)) + r.code;
    at = r.start + r.code.length;
  }
  out += blank(src.slice(at));
  // Source order, so a sink entry's `at` rises with its `source` and a lookup can stop
  // at the first block past the index it is resolving.
  extra.sort((a, b) => a.source - b.source);
  return appendBlocks(out, extra, sink);
}

function prepareCode(code, sink) {
  const blocks = styleObjectBlocks(code).map((b) => ({ text: b.text, source: b.at }));
  return appendBlocks(blankStrings(code), blocks, sink);
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

// Returns `{ text, at }` — `at` is where the object literal starts in `code`, which is
// the line the author edits and the line a `csspro-ignore` marker sits above.
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
  if (decls) blocks.push({ text: `x{ ${decls}}`, at: start });
  return i;
}
