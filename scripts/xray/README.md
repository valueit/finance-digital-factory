# Xray Cloud integration

Scripts in this folder publish Playwright JUnit results to Xray Cloud.

## Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `authenticate.ts` | `npm run xray:auth` | Obtain an Xray Cloud bearer token |
| `create-test-execution.ts` | `npm run xray:create-execution` | Create or reuse a Test Execution |
| `import-results.ts` | `npm run xray:import` | Import JUnit results into Xray |

## Required environment variables

```text
XRAY_CLIENT_ID
XRAY_CLIENT_SECRET
JIRA_PROJECT_KEY
XRAY_TEST_EXECUTION_KEY   # optional — reuse an existing execution
DRY_RUN=true              # validation mode, no API writes
```

Optional mapping overrides:

```text
XRAY_TEST_KEY_UI=FDF-1
XRAY_TEST_KEY_API=FDF-2
```

## Default mapping

```text
tests/ui/create-and-submit-financing-request.spec.ts → FDF-TEST-UI
tests/api/reject-request-without-amount.spec.ts      → FDF-TEST-API
```

Replace these placeholders with real Jira/Xray issue keys via environment variables before production use.

## Dry-run mode

```bash
DRY_RUN=true npm run xray:import
```

This prints detected parameters, mapped keys, JUnit files and intended actions without calling Xray.

## Live import

```bash
npm run test
DRY_RUN=false npm run xray:import
```

Never commit secrets. Store credentials in GitHub Actions secrets or a local `.env` file ignored by Git.
