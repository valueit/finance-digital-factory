import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticateXray } from './authenticate.js';
import { XRAY_TEST_MAPPING } from './mapping.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_JUNIT = path.join(ROOT, 'test-results/junit-results.xml');

export async function createTestExecution(token: string): Promise<string> {
  const projectKey = process.env.JIRA_PROJECT_KEY;
  if (!projectKey) {
    throw new Error('JIRA_PROJECT_KEY is required to create a Test Execution');
  }

  const res = await fetch('https://xray.cloud.getxray.app/api/v2/import/execution', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      info: {
        summary: `Finance Digital Factory Playwright execution ${new Date().toISOString()}`,
        description: 'Automated Test Execution created from Playwright JUnit results',
        project: projectKey,
      },
      tests: [],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create Test Execution (${res.status}): ${text}`);
  }

  const body = (await res.json()) as { key?: string; id?: string };
  if (!body.key) {
    throw new Error(`Unexpected create execution response: ${JSON.stringify(body)}`);
  }
  return body.key;
}

async function main(): Promise<void> {
  const existing = process.env.XRAY_TEST_EXECUTION_KEY;

  if (process.env.DRY_RUN === 'true') {
    console.log('[xray:create-execution] DRY_RUN=true');
    console.log(`[xray:create-execution] JIRA_PROJECT_KEY=${process.env.JIRA_PROJECT_KEY || '(empty)'}`);
    console.log(
      `[xray:create-execution] XRAY_TEST_EXECUTION_KEY=${existing || '(empty — would create new)'}`
    );
    console.log('[xray:create-execution] Mapped tests:', XRAY_TEST_MAPPING);
    return;
  }

  if (existing) {
    console.log(`[xray:create-execution] Using existing Test Execution: ${existing}`);
    return;
  }

  const token = await authenticateXray();
  const key = await createTestExecution(token);
  console.log(`[xray:create-execution] Created Test Execution: ${key}`);
}

const isDirectRun = process.argv[1]?.includes('create-test-execution');
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { DEFAULT_JUNIT };
