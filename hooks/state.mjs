import { tmpdir } from 'node:os';
import { join } from 'node:path';

const safe = (v) => String(v ?? 'main').replace(/[^\w-]/g, '_');

export const stateFile = (kind, { session_id, agent_id } = {}) =>
  join(tmpdir(), `css-pro-${kind}-${safe(session_id)}${agent_id ? `-${safe(agent_id)}` : ''}.txt`);
