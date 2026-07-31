import { test as base, expect, type APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const DEMO_RESET_TOKEN = process.env.DEMO_RESET_TOKEN || 'demo-reset-token';
const TEST_AGENT_USERNAME = process.env.TEST_AGENT_USERNAME || 'agent';
const TEST_AGENT_PASSWORD = process.env.TEST_AGENT_PASSWORD || 'agent123';

export async function resetDemoData(request: APIRequestContext): Promise<void> {
  const res = await request.post(`${API_BASE_URL}/api/demo/reset`, {
    headers: { 'x-demo-reset-token': DEMO_RESET_TOKEN },
  });
  expect(res.ok()).toBeTruthy();
}

export async function loginAsAgent(
  request: APIRequestContext
): Promise<string> {
  const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: {
      username: TEST_AGENT_USERNAME,
      password: TEST_AGENT_PASSWORD,
    },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.accessToken as string;
}

export { API_BASE_URL, DEMO_RESET_TOKEN, TEST_AGENT_PASSWORD, TEST_AGENT_USERNAME };
export { expect };

export const test = base;
