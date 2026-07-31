import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticateXray } from './authenticate.js';
import { createTestExecution, DEFAULT_JUNIT } from './create-test-execution.js';
import { XRAY_TEST_MAPPING } from './mapping.js';

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

async function importJunit(
  token: string,
  junitPath: string,
  executionKey?: string
): Promise<string> {
  const projectKey = process.env.JIRA_PROJECT_KEY;
  if (!projectKey) {
    throw new Error('JIRA_PROJECT_KEY is required');
  }

  const params = new URLSearchParams({ projectKey });
  if (executionKey) {
    params.set('testExecKey', executionKey);
  }

  const xml = fs.readFileSync(junitPath);
  const res = await fetch(
    `https://xray.cloud.getxray.app/api/v2/import/execution/junit?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        Authorization: `Bearer ${token}`,
      },
      body: xml,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`JUnit import failed (${res.status}): ${text}`);
  }

  const body = (await res.json()) as {
    key?: string;
    testExecIssue?: { key?: string };
  };
  return body.key || body.testExecIssue?.key || executionKey || '(unknown)';
}

async function main(): Promise<void> {
  let junitPath = DEFAULT_JUNIT;
  try {
    junitPath = findJunitFile();
  } catch {
    junitPath = DEFAULT_JUNIT;
  }

  const dryRun = process.env.DRY_RUN === 'true';
  const existingExecution = process.env.XRAY_TEST_EXECUTION_KEY;

  console.log('[xray:import] Parameters');
  console.log(`  DRY_RUN=${process.env.DRY_RUN ?? '(unset)'}`);
  console.log(`  JIRA_PROJECT_KEY=${process.env.JIRA_PROJECT_KEY || '(empty)'}`);
  console.log(`  XRAY_TEST_EXECUTION_KEY=${existingExecution || '(empty)'}`);
  console.log(`  XRAY_CLIENT_ID set: ${Boolean(process.env.XRAY_CLIENT_ID)}`);
  console.log(`  XRAY_CLIENT_SECRET set: ${Boolean(process.env.XRAY_CLIENT_SECRET)}`);
  console.log(`  JUnit file: ${junitPath} (exists=${fs.existsSync(junitPath)})`);
  console.log('  Test mapping:', XRAY_TEST_MAPPING);

  if (dryRun) {
    console.log('[xray:import] DRY_RUN actions that would run:');
    console.log('  1. Authenticate to Xray Cloud');
    if (existingExecution) {
      console.log(`  2. Reuse Test Execution ${existingExecution}`);
    } else {
      console.log('  2. Create a new Test Execution');
    }
    console.log('  3. Import JUnit results and associate mapped tests');
    console.log('  4. Print the resulting Test Execution key');
    return;
  }

  if (!fs.existsSync(junitPath)) {
    throw new Error(`JUnit report not found at ${junitPath}`);
  }

  const token = await authenticateXray();
  let executionKey = existingExecution;

  if (!executionKey) {
    executionKey = await createTestExecution(token);
    console.log(`[xray:import] Created Test Execution: ${executionKey}`);
  } else {
    console.log(`[xray:import] Using existing Test Execution: ${executionKey}`);
  }

  const resultKey = await importJunit(token, junitPath, executionKey);
  console.log('[xray:import] Import completed');
  console.log(`[xray:import] Test Execution key: ${resultKey}`);
}

main().catch((err) => {
  console.error('[xray:import] Failed:', err);
  process.exit(1);
});
