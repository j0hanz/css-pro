#!/usr/bin/env node
import { appendFileSync, readFileSync, statSync } from 'node:fs';
import { text } from 'node:stream/consumers';
import { AUDITABLE, cap, MAX_BYTES, stateFile, STYLESHEET } from './changed.mjs';
import { prepare } from './strip.mjs';
import { ADVISE, BLOCK, DECLARATION, runRules, STYLE_MARKERS } from './rules.mjs';

const MODE = process.argv[2];
const ADVISORY_CAP = 3;
const DEGRADED = '\0degraded';

function addedText({ tool_name, tool_input = {} }) {
  if (tool_name === 'Write') return tool_input.content ?? '';
  if (tool_name === 'Edit') return tool_input.new_string ?? '';
  return '';
}

function recall(ledger) {
  try {
    return new Set(readFileSync(ledger, 'utf8').split('\n'));
  } catch {
    return new Set();
  }
}

function remember(ledger, keys) {
  if (!keys.length) return;
  try {
    appendFileSync(ledger, keys.join('\n') + '\n');
  } catch {}
}

const site = (text, at) =>
  text
    .slice(at, at + 60)
    .split(/[\n;{}]/)[0]
    .replace(/\s+/g, ' ')
    .trim();

const firedMessages = (rules, text, path, readFile) =>
  runRules(rules, text, path, readFile).map((h) => {
    const where = site(text, h.at[0]);
    return where ? `${h.msg}  [${where}]` : h.msg;
  });

let payload = {};
try {
  payload = JSON.parse((await text(process.stdin)) || '{}');
  const path = payload.tool_input?.file_path;
  if (!path || !AUDITABLE.test(path)) process.exit(0);

  const isSheet = STYLESHEET.test(path);
  const raw = addedText(payload);
  if (!raw) process.exit(0);
  if (!isSheet && !STYLE_MARKERS.test(raw) && !DECLARATION.test(raw)) process.exit(0);

  const added = prepare(raw, path).text;

  let cached;
  const readFile = () => {
    if (cached === undefined) {
      try {
        cached = prepare(readFileSync(path, 'utf8'), path).text;
      } catch {
        cached = null;
      }
    }
    return cached;
  };

  const ledger = stateFile('said', payload);
  const key = (msg) => `${path}\t${msg}`;
  const BASELINED = key('');

  function baselineExistingAdvisories() {
    try {
      if (statSync(path).size <= MAX_BYTES) {
        const before = readFile();
        if (before !== null)
          remember(ledger, firedMessages(ADVISE, before, path, readFile).map(key));
      }
    } catch {}
    remember(ledger, [BASELINED]);
  }

  if (MODE === 'pre') {
    if (!recall(ledger).has(BASELINED)) baselineExistingAdvisories();

    const blocks = firedMessages(BLOCK, added, path, () => null);
    if (blocks.length) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason:
              `css-pro refused this write to ${path}:\n` +
              blocks.map((m) => `- ${m}`).join('\n') +
              '\nFix these and write again. css-craft covers the mechanics, ' +
              'motion-craft the duration and easing values.',
          },
        }),
      );
    }
  } else if (MODE === 'post') {
    const said = recall(ledger);
    const advisories = firedMessages(ADVISE, added, path, readFile).filter(
      (m) => !said.has(key(m)),
    );
    if (advisories.length) {
      const { shown, note } = cap(advisories, ADVISORY_CAP, 'finding(s)');
      remember(ledger, advisories.map(key));
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext:
              `css-pro on ${path}:\n` + shown.map((m) => `- ${m}`).join('\n') + note,
          },
        }),
      );
    }
  }
} catch (e) {
  const why = String(e?.message ?? e).split('\n')[0];
  const say = () =>
    process.stdout.write(
      JSON.stringify({
        systemMessage: `css-pro: check skipped (${why}). Writes are not being blocked.`,
      }),
    );
  if (payload.session_id) {
    const ledger = stateFile('said', payload);
    if (!recall(ledger).has(DEGRADED)) {
      remember(ledger, [DEGRADED]);
      say();
    }
  } else {
    say();
  }
}
