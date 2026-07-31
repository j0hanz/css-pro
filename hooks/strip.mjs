// Comments and string literals are not code. Rules that match inside them fire on
// prose — `/* avoid transition: all */` was blocking writes before this existed.
// Newlines are preserved so whole-file "is X absent" checks stay meaningful.

const blank = (s) => s.replace(/[^\n]/g, ' ');

// `//` is a comment in SCSS/Sass/Less and in JS, but NOT in plain CSS, where it can
// appear inside an unquoted url(). Only strip it where it means what we think.
const LINE_COMMENT_LANGS = /\.(scss|sass|less|[cm]?[jt]sx?|vue|svelte)$/i;

export function strip(text, filePath = '') {
  const lineComments = LINE_COMMENT_LANGS.test(filePath);
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

    if (lineComments && c === '/' && next === '/') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? text.length : end;
      out += blank(text.slice(i, stop));
      i = stop;
      continue;
    }

    // Template literals carry the CSS in styled-components, so their contents are real
    // declarations and fall through untouched. Quoted strings are content/urls: blank them.
    if (c === '"' || c === "'") {
      let j = i + 1;
      // An unterminated quote stops at the newline rather than swallowing the file.
      while (j < text.length && text[j] !== c && text[j] !== '\n') {
        j += text[j] === '\\' ? 2 : 1;
      }
      const closed = text[j] === c;
      out += c + blank(text.slice(i + 1, j)) + (closed ? c : '');
      i = closed ? j + 1 : j; // leave the newline for the next pass — line count must hold
      continue;
    }

    out += c;
    i++;
  }

  return out;
}
