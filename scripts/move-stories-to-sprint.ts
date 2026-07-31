import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQaConfig } from '../src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

interface MappingEntry {
  key: string;
  type: string;
}

async function jiraFetch<T>(
  baseUrl: string,
  auth: string,
  apiPath: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${baseUrl}${apiPath}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${init?.method || 'GET'} ${apiPath} failed (${res.status}): ${(await res.text()).slice(0, 500)}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

async function main(): Promise<void> {
  const config = loadQaConfig();
  const base = config.jiraBaseUrl.replace(/\/$/, '');
  const auth = Buffer.from(`${config.jiraEmail}:${config.jiraApiToken}`).toString('base64');

  const mappingPath = path.join(ROOT, 'generated/demo-object-mapping.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8')) as Record<string, MappingEntry>;
  const storyKeys = Object.values(mapping)
    .filter((v) => v.type === 'Story')
    .map((v) => v.key);

  if (!storyKeys.length) {
    throw new Error('No stories found in demo-object-mapping.json');
  }

  console.log('[sprint] Stories to move:', storyKeys.join(', '));

  const boards = await jiraFetch<{
    values: Array<{ id: number; name: string }>;
  }>(base, auth, `/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(config.jiraProjectKey)}&maxResults=50`);

  if (!boards.values?.length) {
    throw new Error(`No board found for project ${config.jiraProjectKey}`);
  }

  const board = boards.values[0];
  console.log(`[sprint] Using board ${board.id} — ${board.name}`);

  const sprints = await jiraFetch<{
    values: Array<{ id: number; name: string; state: string }>;
  }>(base, auth, `/rest/agile/1.0/board/${board.id}/sprint?state=active,future&maxResults=20`);

  let sprint = sprints.values?.find((s) => s.state === 'active');
  if (!sprint) {
    sprint = sprints.values?.find((s) => s.state === 'future');
  }

  if (!sprint) {
    // Create a demo sprint if none exists
    const created = await jiraFetch<{ id: number; name: string; state: string }>(
      base,
      auth,
      `/rest/agile/1.0/sprint`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: `FDF Demo Sprint ${new Date().toISOString().slice(0, 10)}`,
          originBoardId: board.id,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
        }),
      }
    );
    sprint = { id: created.id, name: created.name, state: 'future' };
    console.log(`[sprint] Created sprint ${sprint.id} — ${sprint.name}`);
  }

  // Ensure sprint is active (stories must land on the board, not backlog)
  if (sprint.state !== 'active') {
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
    await jiraFetch(base, auth, `/rest/agile/1.0/sprint/${sprint.id}`, {
      method: 'POST',
      body: JSON.stringify({
        id: sprint.id,
        state: 'active',
        name: sprint.name,
        startDate,
        endDate,
      }),
    });
    sprint = { ...sprint, state: 'active' };
    console.log(`[sprint] Started sprint ${sprint.id} — ${sprint.name}`);
  }

  console.log(`[sprint] Target sprint ${sprint.id} — ${sprint.name} (${sprint.state})`);

  await jiraFetch(base, auth, `/rest/agile/1.0/sprint/${sprint.id}/issue`, {
    method: 'POST',
    body: JSON.stringify({ issues: storyKeys }),
  });

  console.log(`[sprint] Moved ${storyKeys.length} stories into sprint "${sprint.name}"`);
  console.log(
    `[sprint] Board URL: ${base}/jira/software/projects/${config.jiraProjectKey}/boards/${board.id}`
  );
}

main().catch((err) => {
  console.error('[sprint] FAILED:', err);
  process.exit(1);
});
