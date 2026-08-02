const blank = (s) => s.replace(/[^\n]/g, ' ');

export const LINE_COMMENT_LANGS = /\.(scss|sass|less|[cm]?[jt]sx?)$/i;
export const MARKUP_LANGS = /\.(html?|astro|vue|svelte)$/i;
const HOST_CODE = /\.[cm]?[jt]sx?$/i;
const STYLE_LANG = /\blang\s*=\s*["']?(?:scss|sass|less)/i;
export const MARKUP_ANCHOR = /<\/?(?:style|script)\b|\bstyle\s*=\s*["']|^---\r?$/im;
export function prepare(text, filePath = '') {
  if (MARKUP_LANGS.test(filePath) && MARKUP_ANCHOR.test(text)) return prepareMarkup(text);
  return prepareCode(
    stripComments(text, LINE_COMMENT_LANGS.test(filePath)),
    HOST_CODE.test(filePath),
  );
}

function appendBlocks(head, extra) {
  const blocks = [];
  let text = head;
  for (const b of extra) {
    blocks.push({ at: text.length + 1, source: b.source });
    text += `\n${b.text}`;
  }
  return { text, blocks };
}

const contentStart = (m, body, closeLen) => m.index + m[0].length - body.length - closeLen;

function prepareMarkup(text) {
  const src = text.replace(/<!--[\s\S]*?-->/g, blank);
  const regions = [];
  const extra = [];

  const frontmatter = src.match(/^---\r?\n([\s\S]*?)^---/m);
  if (frontmatter) {
    const code = stripComments(frontmatter[1], true);
    const start = contentStart(frontmatter, code, '---'.length);
    regions.push({ start, code: blankStrings(keepTemplates(code)) });
    for (const b of styleObjectBlocks(code)) extra.push({ text: b.text, source: start + b.at });
  }
  for (const m of src.matchAll(/<style\b([^>]*)>([\s\S]*?)(?=<\/style|$)/gi))
    regions.push({
      start: contentStart(m, m[2], 0),
      code: blankStrings(stripComments(m[2], STYLE_LANG.test(m[1]))),
    });
  for (const m of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script/gi)) {
    const code = stripComments(m[1], true);
    const start = contentStart(m, m[1], '</script'.length);
    regions.push({ start, code: blankStrings(keepTemplates(code)) });
    for (const b of styleObjectBlocks(code)) extra.push({ text: b.text, source: start + b.at });
  }
  for (const m of src.matchAll(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const css = m[1] ?? m[2];
    if (css.trim()) extra.push({ text: `x{ ${css} }`, source: m.index });
  }

  let out = '';
  let at = 0;
  for (const r of regions.sort((a, b) => a.start - b.start)) {
    if (r.start < at) continue;
    out += blank(src.slice(at, r.start)) + r.code;
    at = r.start + r.code.length;
  }
  out += blank(src.slice(at));
  extra.sort((a, b) => a.source - b.source);
  return appendBlocks(out, extra);
}

function prepareCode(code, hostCode) {
  const extra = styleObjectBlocks(code).map((b) => ({ text: b.text, source: b.at }));
  return appendBlocks(blankStrings(hostCode ? keepTemplates(code) : code), extra);
}

function keepTemplates(code) {
  let out = '';
  let i = 0;
  while (i < code.length) {
    if (code[i] !== '`') {
      out += blank(code[i]);
      i++;
      continue;
    }
    const end = skipString(code, i);
    out += ' ';
    let k = i + 1;
    while (k < end) {
      if (code[k] === '$' && code[k + 1] === '{') {
        const stop = Math.min(closingBrace(code, k + 2), end);
        out += blank(code.slice(k, stop));
        k = stop;
        continue;
      }
      out += code[k] === '`' ? ' ' : code[k];
      k++;
    }
    i = end;
  }
  return out;
}

function closingBrace(text, from) {
  let depth = 1;
  let k = from;
  while (k < text.length) {
    const ch = text[k];
    if (ch === '"' || ch === "'" || ch === '`') {
      k = skipString(text, k);
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return k + 1;
    k++;
  }
  return text.length;
}

// Both scanners below preserve length: every byte they neutralise is replaced by a
// space, and newlines survive. Callers rely on that to keep offsets and line counts.
export function stripComments(text, lineComments) {
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
    if (c === '#' && next === '{') {
      const stop = closingBrace(text, i + 2);
      out += blank(text.slice(i, stop));
      i = stop;
      continue;
    }
    if (c === '`') {
      const j = skipString(text, i);
      const closed = j > i + 1 && text[j - 1] === '`';
      out +=
        '`' + stripComments(text.slice(i + 1, closed ? j - 1 : j), false) + (closed ? '`' : '');
      i = j;
      continue;
    }
    if (lineComments && c === '/' && next === '/') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? text.length : end;
      out += blank(text.slice(i, stop));
      i = stop;
      continue;
    }
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

export function blankStrings(text) {
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

const PAIR =
  /(?:"([^"\n]+)"|'([^'\n]+)'|([A-Za-z_$][\w$]*))\s*:\s*(?:"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|(-?(?:\d+\.?\d*|\.\d+)))/g;

function styleObjectBlocks(code) {
  const region =
    /\b(?:(?:style|css|sx)\s*=\s*\{|(?:style|css|createStyles|keyframes)\s*\(|styled\s*(?:\.\w+|\(\s*["'][^"']*["']\s*\))\s*\()\s*\{/g;
  const blocks = [];
  while (region.exec(code)) {
    region.lastIndex = scanObject(code, region.lastIndex, blocks);
  }
  return blocks;
}

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
