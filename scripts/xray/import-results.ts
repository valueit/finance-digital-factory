import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticateXray } from './authenticate.js';
import { DEFAULT_JUNIT } from './create-test-execution.js';
import { resolveXrayTestKey, XRAY_TEST_MAPPING } from './mapping.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function findJunitFile(): string {
  const configured = process.env.JUNIT_RESULTS_PATH;
  if (configured && fs.existsSync(configured)) {
    return configured;
  }
  if (fs.existsSync(DEFAULT_JUNIT)) {
    return DEFAULT_JUNIT;
  }
  throw new Error(`JUnit report not found at ${DEFAULT_JUNIT}`);
}

/**
 * Inject Xray Test issue keys into JUnit XML so Cloud import can link results.
 * Playwright classname looks like: api/reject-request-without-amount.spec.ts
 */
function injectXrayKeys(junitXml: string): string {
  return junitXml.replace(
    /<testcase\b([^>]*)>/g,
    (full, attrs: string) => {
      const classMatch = attrs.match(/\bclassname="([^"]+)"/);
      const nameMatch = attrs.match(/\bname="([^"]+)"/);
      if (!classMatch) return full;

      const classname = classMatch[1];
      const key =
        resolveXrayTestKey(classname) ||
        resolveXrayTestKey(`tests/${classname}`) ||
        resolveXrayTestKey(classname.replace(/^.*\//, ''));

      if (!key) return full;

      // Ensure key appears in the test name (Xray Cloud matcher)
      let nextAttrs = attrs;
      if (nameMatch && !nameMatch[1].includes(key)) {
        const newName = `${nameMatch[1]} ${key}`;
        nextAttrs = nextAttrs.replace(/\bname="[^"]*"/, `name="${newName}"`);
      }

      return `<testcase${nextAttrs}>\n<properties><property name="test_key" value="${key}"/></properties>`;
    }
  );
}

async function importJunit(
  token: string,
  junitXml: string,
  executionKey?: string
): Promise<{ key: string; raw: unknown }> {
  const projectKey = process.env.JIRA_PROJECT_KEY;
  if (!projectKey) {
    throw new Error('JIRA_PROJECT_KEY is required');
  }

  const params = new URLSearchParams({ projectKey });
  if (executionKey) {
    params.set('testExecKey', executionKey);
  }

  // Optional: set a clear TE summary via query is not supported on junit endpoint;
  // Xray creates a TE automatically when testExecKey is omitted.
  const res = await fetch(
    `https://xray.cloud.getxray.app/api/v2/import/execution/junit?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        Authorization: `Bearer ${token}`,
      },
      body: junitXml,
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`JUnit import failed (${res.status}): ${text}`);
  }

  let body: {
    key?: string;
    id?: string;
    testExecIssue?: { key?: string; id?: string };
  } = {};
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    throw new Error(`Unexpected non-JSON Xray response: ${text.slice(0, 500)}`);
  }

  const key = body.key || body.testExecIssue?.key;
  if (!key) {
    throw new Error(`Xray import succeeded but no Test Execution key returned: ${text}`);
  }
  return { key, raw: body };
}

async function main(): Promise<void> {
  let junitPath = DEFAULT_JUNIT;
  try {
    junitPath = findJunitFile();
  } catch {
    junitPath = DEFAULT_JUNIT;
  }

  const dryRunRaw = (process.env.DRY_RUN ?? '').trim().toLowerCase();
  const dryRun = dryRunRaw === 'true' || dryRunRaw === '1' || dryRunRaw === 'yes';
  const existingExecution = (process.env.XRAY_TEST_EXECUTION_KEY || '').trim();

  console.log('[xray:import] Parameters');
  console.log(`  DRY_RUN active: ${dryRun} (raw=${JSON.stringify(process.env.DRY_RUN ?? null)})`);
  console.log(`  JIRA_PROJECT_KEY set: ${Boolean(process.env.JIRA_PROJECT_KEY)}`);
  console.log(`  XRAY_TEST_EXECUTION_KEY=${existingExecution || '(empty → Xray will create a new TE)'}`);
  console.log(`  XRAY_CLIENT_ID set: ${Boolean(process.env.XRAY_CLIENT_ID)}`);
  console.log(`  XRAY_CLIENT_SECRET set: ${Boolean(process.env.XRAY_CLIENT_SECRET)}`);
  console.log(`  JUnit file: ${junitPath} (exists=${fs.existsSync(junitPath)})`);
  console.log('  Test mapping:', XRAY_TEST_MAPPING);

  if (dryRun) {
    console.log('[xray:import] DRY_RUN=true → no remote Xray write. Exiting successfully.');
    return;
  }

  if (!fs.existsSync(junitPath)) {
    console.warn(`[xray:import] JUnit report missing at ${junitPath}`);
    console.warn('[xray:import] Skipping Xray publish (no results file).');
    process.exit(0);
  }

  const original = fs.readFileSync(junitPath, 'utf8');
  const enriched = injectXrayKeys(original);
  const enrichedPath = path.join(path.dirname(junitPath), 'junit-results.xray.xml');
  fs.writeFileSync(enrichedPath, enriched);
  console.log(`[xray:import] Wrote enriched JUnit: ${enrichedPath}`);

  const token = await authenticateXray();
  console.log('[xray:import] Authenticated to Xray Cloud');

  // Do NOT pre-create an empty Test Execution (often fails / useless).
  // Importing JUnit without testExecKey creates a new TE automatically.
  const result = await importJunit(
    token,
    enriched,
    existingExecution || undefined
  );

  console.log('[xray:import] Import completed');
  console.log(`[xray:import] Test Execution key: ${result.key}`);
  console.log(
    `[xray:import] URL: ${process.env.JIRA_BASE_URL || 'https://valueit-labs.atlassian.net'}/browse/${result.key}`
  );
}

main().catch((err) => {
  console.error('[xray:import] Failed:', err);
  process.exit(1);
});
