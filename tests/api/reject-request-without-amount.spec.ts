import {
  test,
  expect,
  resetDemoData,
  loginAsAgent,
  API_BASE_URL,
} from '../helpers';

test.describe('Reject request without amount', () => {
  test.beforeEach(async ({ request }) => {
    await resetDemoData(request);
  });

  test('API rejects financing request without amount @FDF-TEST-API', async ({
    request,
  }) => {
    const token = await loginAsAgent(request);

    const res = await request.post(`${API_BASE_URL}/api/financing-requests`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        applicantName: 'Demo Applicant',
        applicantIdentifier: 'DEMO-CIN-001',
        durationMonths: 36,
        purpose: 'Vehicle financing',
        monthlyIncome: 15000,
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('AMOUNT_REQUIRED');
    expect(body.message).toBe('Amount is required');
  });
});
