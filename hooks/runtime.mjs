#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { text } from 'node:stream/consumers';
import { prepare } from './strip.mjs';
import { BLOCK, ADVISE, STYLE_MARKERS, DECLARATION } from './rules.mjs';

const MODE = process.argv[2];
const ADVISORY_CAP = 3;

const STYLESHEET = /\.(css|scss|sass|less)$/i;
const HOST = /\.([cm]?[jt]sx?|vue|svelte|astro|html?)$/i;

function addedText({ tool_name, tool_input = {} }) {
  if (tool_name === 'Write') return tool_input.content ?? '';
  if (tool_name === 'Edit') return tool_input.new_string ?? '';
  if (tool_name === 'MultiEdit')
    return (tool_input.edits ?? []).map((e) => e.new_string ?? '').join('\n');
  return '';
}

function run(rules, added, readFile, path) {
  const hits = [];
  for (const rule of rules) {
    if (rule.files && !rule.files.test(path)) continue;
    if (rule.fn) {
      if (rule.fn(added)) hits.push(rule.msg);
      continue;
    }
    if (rule.re) {
      if (rule.re.test(added)) hits.push(rule.msg);
      continue;
    }
    if (!rule.when.every((w) => w.test(added))) continue;
    const file = readFile();
    if (file === null || rule.absent.test(file)) continue;
    hits.push(rule.msg);
  }
  return hits;
}

try {
  const payload = JSON.parse((await text(process.stdin)) || '{}');
  const path = payload.tool_input?.file_path;
  if (!path) process.exit(0);

  const isSheet = STYLESHEET.test(path);
  if (!isSheet && !HOST.test(path)) process.exit(0);

  const raw = addedText(payload);
  if (!raw) process.exit(0);
  if (!isSheet && !STYLE_MARKERS.test(raw) && !DECLARATION.test(raw)) process.exit(0);

  const added = prepare(raw, path);

  let cached;
  const readFile = () => {
    if (cached === undefined) {
      try {
        cached = prepare(readFileSync(path, 'utf8'), path);
      } catch {
        cached = null;
      }
    }
    return cached;
  };

  if (MODE === 'pre') {
    const blocks = run(BLOCK, added, readFile, path);
    if (blocks.length) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason:
              `css-pro refused this write to ${path}:\n` +
              blocks.map((m) => `- ${m}`).join('\n') +
              '\nFix these and write again.',
          },
        }),
      );
    }
  } else if (MODE === 'post') {
    const advisories = run(ADVISE, added, readFile, path);
    if (advisories.length) {
      const shown = advisories.slice(0, ADVISORY_CAP);
      const withheld = advisories.length - shown.length;
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext:
              `css-pro on ${path}:\n` +
              shown.map((m) => `- ${m}`).join('\n') +
              (withheld ? `\n(${withheld} further finding(s) not shown.)` : ''),
          },
        }),
      );
    }
  }
} catch (e) {
  console.error(`css-pro: check skipped (${e.message.split('\n')[0]})`);
}
