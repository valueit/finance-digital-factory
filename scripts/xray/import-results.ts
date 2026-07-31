import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticateXray } from './authenticate.js';
import { DEFAULT_JUNIT } from './create-test-execution.js';
import { resolveXrayTestKey, XRAY_TEST_MAPPING } from './mapping.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
dotenv.config({ path: path.resolve(ROOT, '.env') });

function loadTestPlanKey(): string {
  if (process.env.XRAY_TEST_PLAN_KEY?.trim()) {
    return process.env.XRAY_TEST_PLAN_KEY.trim();
  }
  try {
    const mapping = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'generated/demo-object-mapping.json'), 'utf8')
    ) as Record<string, { key?: string }>;
    return mapping['FDF-PLAN-R10']?.key || 'FDF-31';
  } catch {
    return 'FDF-31';
  }
}

function findJunitFile(): string {
  const configured = process.env.JUNIT_RESULTS_PATH;
  if (configured && fs.existsSync(configured)) return configured;
  if (fs.existsSync(DEFAULT_JUNIT)) return DEFAULT_JUNIT;
  throw new Error(`JUnit report not found at ${DEFAULT_JUNIT}`);
}

function buildExecutionSummary(): string {
  const run = process.env.GITHUB_RUN_NUMBER || 'local';
  const outcome = process.env.DEMO_OUTCOME || 'success';
  const envName = process.env.TEST_ENVIRONMENT || 'PREPROD';
  const release = process.env.RELEASE_NAME || 'R1.0';
  return `AUTO — TNR complète — ${release} RC2 — B${run} — ${envName} — ${outcome}`;
}

function buildExecutionDescription(): string {
  const lines = [
    'Automated Playwright execution published by CI/CD.',
    '',
    `Release: ${process.env.RELEASE_NAME || 'R1.0'}`,
    `Environment: ${process.env.TEST_ENVIRONMENT || 'PREPROD'}`,
    `Outcome requested: ${process.env.DEMO_OUTCOME || 'n/a'}`,
    `GitHub run: #${process.env.GITHUB_RUN_NUMBER || 'local'}`,
    `Workflow: ${process.env.GITHUB_WORKFLOW || 'n/a'}`,
    `Commit: ${process.env.GITHUB_SHA || 'n/a'}`,
    `Branch: ${process.env.GITHUB_REF_NAME || 'n/a'}`,
    `Actor: ${process.env.GITHUB_ACTOR || 'n/a'}`,
    `Repository: ${process.env.GITHUB_REPOSITORY || 'n/a'}`,
    process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `Run URL: ${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : '',
    '',
    'Mapped Playwright tests:',
    ...Object.entries(XRAY_TEST_MAPPING).map(([file, key]) => `- ${key} ← ${file}`),
  ];
  return lines.filter(Boolean).join('\n');
}

function injectXrayKeys(junitXml: string): string {
  const contextOut = [
    `release=${process.env.RELEASE_NAME || 'R1.0'}`,
    `environment=${process.env.TEST_ENVIRONMENT || 'PREPROD'}`,
    `build=B${process.env.GITHUB_RUN_NUMBER || 'local'}`,
    `commit=${(process.env.GITHUB_SHA || 'local').slice(0, 8)}`,
    `outcome=${process.env.DEMO_OUTCOME || 'n/a'}`,
  ].join(' | ');

  // Handle both <testcase ...>…</testcase> and self-closing <testcase .../>
  return junitXml.replace(
    /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g,
    (full, attrs: string, closer: string, inner = '') => {
      const classMatch = attrs.match(/\bclassname="([^"]+)"/);
      const nameMatch = attrs.match(/\bname="([^"]+)"/);
      if (!classMatch) return full;

      const classname = classMatch[1];
      const key =
        resolveXrayTestKey(classname) ||
        resolveXrayTestKey(`tests/${classname}`) ||
        resolveXrayTestKey(classname.replace(/^.*\//, ''));

      if (!key) return full;

      let nextAttrs = attrs.trim().replace(/\/\s*$/, '');
      if (nameMatch && !nameMatch[1].includes(key)) {
        nextAttrs = nextAttrs.replace(/\bname="[^"]*"/, `name="${nameMatch[1]} ${key}"`);
      }

      const systemOut = `${contextOut} | testKey=${key} | suite=${classname}`;
      const safeOut = systemOut.replace(/[<>&]/g, '');
      const body =
        closer === '/>'
          ? ''
          : String(inner)
              .replace(/<properties>[\s\S]*?<\/properties>/g, '')
              .replace(/<system-out>[\s\S]*?<\/system-out>/g, '');

      return `<testcase ${nextAttrs}>
<properties>
  <property name="test_key" value="${key}"/>
</properties>
<system-out>${safeOut}</system-out>
${body}</testcase>`;
    }
  );
}

async function importJunitMultipart(
  token: string,
  junitXml: string,
  executionKey?: string
): Promise<{ key: string; raw: unknown }> {
  const projectKey = process.env.JIRA_PROJECT_KEY;
  if (!projectKey) throw new Error('JIRA_PROJECT_KEY is required');

  const testPlanKey = loadTestPlanKey();
  const environment = process.env.TEST_ENVIRONMENT || 'PREPROD';
  const releaseName = process.env.RELEASE_NAME || 'R1.0';
  const revision =
    process.env.GITHUB_SHA?.slice(0, 12) ||
    `local-${new Date().toISOString().replace(/[:.]/g, '-')}`;

  const info = {
    fields: {
      project: { key: projectKey },
      summary: buildExecutionSummary(),
      description: buildExecutionDescription(),
      issuetype: { name: 'Test Execution' },
      fixVersions: [{ name: releaseName }],
      labels: ['DEMO-FINANCE-QA', 'playwright', 'ci-pipeline'],
    },
    xrayFields: {
      testPlanKey,
      // Environments attached after import (auto-create via GraphQL if missing)
    },
  };

  // Prefer real files on disk — Node FormData + File is more reliable than Blob alone
  const tmpDir = path.join(ROOT, 'test-results');
  fs.mkdirSync(tmpDir, { recursive: true });
  const infoPath = path.join(tmpDir, 'xray-info.json');
  const resultsPath = path.join(tmpDir, 'junit-results.xray.xml');
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));
  fs.writeFileSync(resultsPath, junitXml);

  const form = new FormData();
  form.append(
    'info',
    new Blob([fs.readFileSync(infoPath)], { type: 'application/json' }),
    'info.json'
  );
  form.append(
    'results',
    new Blob([fs.readFileSync(resultsPath)], { type: 'application/xml' }),
    'junit-results.xml'
  );

  console.log('[xray:import] Multipart info summary:', info.fields.summary);
  console.log('[xray:import] testPlanKey:', testPlanKey);
  console.log('[xray:import] environment:', environment);
  console.log('[xray:import] revision:', revision);
  console.log('[xray:import] fixVersion:', releaseName);

  // Dedicated multipart endpoint (not /junit)
  const res = await fetch(
    'https://xray.cloud.getxray.app/api/v2/import/execution/junit/multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );

  const text = await res.text();
  if (!res.ok) {
    // Fallback: plain XML + query params (metadata added afterwards via Jira/GraphQL)
    console.warn(`[xray:import] Multipart failed (${res.status}): ${text.slice(0, 400)}`);
    console.warn('[xray:import] Falling back to raw XML import with query params');
    const params = new URLSearchParams({ projectKey });
    if (executionKey) params.set('testExecKey', executionKey);
    params.set('testPlanKey', testPlanKey);
    // Do NOT pass testEnvironments here — unknown names fail the whole import.
    // Environments are attached afterwards via GraphQL (auto-creates if needed).
    const fallback = await fetch(
      `https://xray.cloud.getxray.app/api/v2/import/execution/junit?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/xml',
        },
        body: junitXml,
      }
    );
    const fallbackText = await fallback.text();
    if (!fallback.ok) {
      throw new Error(`JUnit import failed (${fallback.status}): ${fallbackText}`);
    }
    const body = JSON.parse(fallbackText) as {
      key?: string;
      id?: string;
      testExecIssue?: { key?: string; id?: string };
    };
    const key = body.key || body.testExecIssue?.key;
    if (!key) throw new Error(`No TE key in fallback response: ${fallbackText}`);
    return { key, raw: body };
  }

  const body = JSON.parse(text) as {
    key?: string;
    id?: string;
    testExecIssue?: { key?: string; id?: string };
  };
  const key = body.key || body.testExecIssue?.key;
  if (!key) throw new Error(`Xray import succeeded but no TE key returned: ${text}`);
  return { key, raw: body };
}

async function enrichTestExecutionInJira(teKey: string): Promise<void> {
  const base = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!base || !email || !token) {
    console.warn('[xray:import] Jira creds missing — skip TE field enrichment');
    return;
  }

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const descriptionText = buildExecutionDescription();
  const adf = {
    type: 'doc',
    version: 1,
    content: descriptionText.split('\n').map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  };

  const res = await fetch(`${base}/rest/api/3/issue/${encodeURIComponent(teKey)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        summary: buildExecutionSummary(),
        description: adf,
        fixVersions: [{ name: process.env.RELEASE_NAME || 'R1.0' }],
        labels: ['DEMO-FINANCE-QA', 'playwright', 'ci-pipeline'],
      },
    }),
  });

  if (!res.ok) {
    console.warn(`[xray:import] TE Jira update failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    return;
  }
  console.log(`[xray:import] Enriched TE ${teKey} with summary/description/fixVersion/labels`);
}

async function xrayGraphql(
  token: string,
  query: string,
  variables: Record<string, unknown>
): Promise<{ data?: unknown; errors?: Array<{ message: string }> }> {
  const res = await fetch('https://xray.cloud.getxray.app/api/v2/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  return (await res.json()) as { data?: unknown; errors?: Array<{ message: string }> };
}

async function enrichExecutionXrayFields(teIssueId: string): Promise<void> {
  try {
    const token = await authenticateXray();
    const environment = process.env.TEST_ENVIRONMENT || 'PREPROD';
    const revision =
      process.env.GITHUB_SHA?.slice(0, 12) ||
      `local-${new Date().toISOString().replace(/[:.]/g, '-')}`;

    // Environments: addTestEnvironmentsToTestExecution can create missing ones
    const envPayload = await xrayGraphql(
      token,
      `mutation($issueId: String!, $testEnvironments: [String!]!) {
        addTestEnvironmentsToTestExecution(
          issueId: $issueId,
          testEnvironments: $testEnvironments
        ) {
          associatedTestEnvironments
          createdTestEnvironments
          warning
        }
      }`,
      { issueId: teIssueId, testEnvironments: [environment] }
    );
    if (envPayload.errors?.length) {
      console.warn(
        '[xray:import] environments warning:',
        envPayload.errors.map((e) => e.message).join('; ')
      );
    } else {
      console.log(`[xray:import] Environments:`, JSON.stringify(envPayload.data));
    }

    // Revision is not exposed via GraphQL Mutation on Cloud — keep it in description/summary
    console.log(`[xray:import] Revision (documented in summary/description): ${revision}`);
  } catch (err) {
    console.warn('[xray:import] Could not set Xray TE fields:', err);
  }
}

async function enrichTestRunOutputs(teIssueId: string): Promise<void> {
  try {
    const token = await authenticateXray();
    const runsPayload = await xrayGraphql(
      token,
      `query($id: String!) {
        getTestExecution(issueId: $id) {
          testRuns(limit: 50) {
            results {
              id
              test { jira(fields: ["key"]) }
            }
          }
        }
      }`,
      { id: teIssueId }
    );
    const runs =
      (
        runsPayload.data as {
          getTestExecution?: {
            testRuns?: { results?: Array<{ id: string; test?: { jira?: { key?: string } } }> };
          };
        }
      )?.getTestExecution?.testRuns?.results || [];

    for (const run of runs) {
      const testKey = run.test?.jira?.key || 'unknown';
      const comment = [
        `CI output for ${testKey}`,
        `release=${process.env.RELEASE_NAME || 'R1.0'}`,
        `environment=${process.env.TEST_ENVIRONMENT || 'PREPROD'}`,
        `build=B${process.env.GITHUB_RUN_NUMBER || 'local'}`,
        `commit=${(process.env.GITHUB_SHA || 'local').slice(0, 12)}`,
        `outcome=${process.env.DEMO_OUTCOME || 'n/a'}`,
        process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
          ? `run=${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');

      const upd = await xrayGraphql(
        token,
        `mutation($id: String!, $comment: String) {
          updateTestRun(id: $id, comment: $comment) {
            warnings
          }
        }`,
        { id: run.id, comment }
      );
      if (upd.errors?.length) {
        console.warn(`[xray:import] test run comment ${testKey}:`, upd.errors.map((e) => e.message).join('; '));
      } else {
        console.log(`[xray:import] Output set on test run ${testKey}`);
      }
    }
  } catch (err) {
    console.warn('[xray:import] Could not set test run outputs:', err);
  }
}

async function linkExecutionToTestPlan(teIssueId: string, testPlanKey: string): Promise<void> {
  try {
    const token = await authenticateXray();
    const base = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
    const email = process.env.JIRA_EMAIL;
    const jiraToken = process.env.JIRA_API_TOKEN;
    if (!base || !email || !jiraToken) return;

    const auth = Buffer.from(`${email}:${jiraToken}`).toString('base64');
    const planRes = await fetch(`${base}/rest/api/3/issue/${encodeURIComponent(testPlanKey)}?fields=id`, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    });
    if (!planRes.ok) return;
    const plan = (await planRes.json()) as { id: string };

    const payload = await xrayGraphql(
      token,
      `mutation($issueId: String!, $testExecIssueIds: [String!]!) {
        addTestExecutionsToTestPlan(issueId: $issueId, testExecIssueIds: $testExecIssueIds) {
          addedTestExecutions
          warning
        }
      }`,
      { issueId: plan.id, testExecIssueIds: [teIssueId] }
    );
    if (payload.errors?.length) {
      console.warn('[xray:import] link to Test Plan warning:', payload.errors.map((e) => e.message).join('; '));
    } else {
      console.log(`[xray:import] Linked TE to Test Plan ${testPlanKey}`);
    }
  } catch (err) {
    console.warn('[xray:import] Could not link TE to Test Plan:', err);
  }
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
  const testPlanKey = loadTestPlanKey();

  console.log('[xray:import] Parameters');
  console.log(`  DRY_RUN active: ${dryRun}`);
  console.log(`  JIRA_PROJECT_KEY set: ${Boolean(process.env.JIRA_PROJECT_KEY)}`);
  console.log(`  XRAY_TEST_EXECUTION_KEY=${existingExecution || '(empty → create new TE)'}`);
  console.log(`  XRAY_TEST_PLAN_KEY=${testPlanKey}`);
  console.log(`  RELEASE_NAME=${process.env.RELEASE_NAME || 'R1.0'}`);
  console.log(`  TEST_ENVIRONMENT=${process.env.TEST_ENVIRONMENT || 'PREPROD'}`);
  console.log(`  GITHUB_RUN_NUMBER=${process.env.GITHUB_RUN_NUMBER || '(local)'}`);
  console.log(`  JUnit file: ${junitPath} (exists=${fs.existsSync(junitPath)})`);
  console.log('  Planned summary:', buildExecutionSummary());
  console.log('  Test mapping:', XRAY_TEST_MAPPING);

  if (dryRun) {
    console.log('[xray:import] DRY_RUN=true → no remote Xray write.');
    return;
  }

  if (!fs.existsSync(junitPath)) {
    console.warn(`[xray:import] JUnit missing at ${junitPath} — skip publish`);
    process.exit(0);
  }

  const enriched = injectXrayKeys(fs.readFileSync(junitPath, 'utf8'));
  const enrichedPath = path.join(path.dirname(junitPath), 'junit-results.xray.xml');
  fs.writeFileSync(enrichedPath, enriched);

  const token = await authenticateXray();
  const result = await importJunitMultipart(token, enriched, existingExecution || undefined);

  console.log('[xray:import] Import completed');
  console.log(`[xray:import] Test Execution key: ${result.key}`);

  await enrichTestExecutionInJira(result.key);

  const raw = result.raw as { id?: string; testExecIssue?: { id?: string } };
  let teId = raw.id || raw.testExecIssue?.id;
  if (!teId) {
    try {
      const base = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
      const email = process.env.JIRA_EMAIL!;
      const jiraToken = process.env.JIRA_API_TOKEN!;
      const auth = Buffer.from(`${email}:${jiraToken}`).toString('base64');
      const teRes = await fetch(`${base}/rest/api/3/issue/${result.key}?fields=id`, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      });
      if (teRes.ok) {
        teId = (await teRes.json() as { id: string }).id;
      }
    } catch (err) {
      console.warn('[xray:import] TE id resolve failed:', err);
    }
  }
  if (teId) {
    await enrichExecutionXrayFields(String(teId));
    await enrichTestRunOutputs(String(teId));
    await linkExecutionToTestPlan(String(teId), testPlanKey);
  }

  const jiraBase = process.env.JIRA_BASE_URL || 'https://valueit-labs.atlassian.net';
  console.log(`[xray:import] URL: ${jiraBase}/browse/${result.key}`);
  console.log(`[xray:import] Test Plan: ${jiraBase}/browse/${testPlanKey}`);
}

main().catch((err) => {
  console.error('[xray:import] Failed:', err);
  process.exit(1);
});
