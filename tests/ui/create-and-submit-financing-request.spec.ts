import { test, expect, resetDemoData, TEST_AGENT_USERNAME, TEST_AGENT_PASSWORD } from '../helpers';

test.describe('Create and submit financing request', () => {
  test.beforeEach(async ({ request }) => {
    await resetDemoData(request);
  });

  test('agent can create and submit a financing request @FDF-29', async ({
    page,
  }) => {
    if (process.env.DEMO_OUTCOME === 'failure') {
      throw new Error('Controlled demo failure requested via DEMO_OUTCOME=failure');
    }

    const unique = Date.now();
    const applicantName = `Demo Applicant ${unique}`;
    const applicantId = `DEMO-CIN-${unique}`;

    await page.goto('/login');
    await page.getByTestId('login-username').fill(TEST_AGENT_USERNAME);
    await page.getByTestId('login-password').fill(TEST_AGENT_PASSWORD);
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('agent-dashboard')).toBeVisible();
    await page.getByTestId('new-financing-request').click();

    await page.getByTestId('applicant-name').fill(applicantName);
    await page.getByTestId('applicant-identifier').fill(applicantId);
    await page.getByTestId('financing-amount').fill('100000');
    await page.getByTestId('financing-duration').selectOption('36');
    await page.getByTestId('financing-purpose').fill(`Vehicle financing ${unique}`);
    await page.getByTestId('monthly-income').fill('15000');

    await page.getByTestId('submit-request').click();

    await expect(page.getByTestId('success-message')).toBeVisible();
    await expect(page.getByTestId('success-message')).toContainText(
      'submitted successfully'
    );
    await expect(page.getByTestId('request-status')).toHaveText('SUBMITTED');
    await expect(page.getByTestId('request-reference')).not.toBeEmpty();
    await expect(page.getByTestId('requests-table')).toContainText(applicantName);
  });
});
