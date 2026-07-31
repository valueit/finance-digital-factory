import type {
  AgentStats,
  FinancingFormData,
  FinancingRequest,
  ManagerKpis,
  UserInfo,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { message?: string }).message || `Request failed (${res.status})`;
    const code = (data as { code?: string }).code;
    const error = new Error(message) as Error & { code?: string; status?: number };
    error.code = code;
    error.status = res.status;
    throw error;
  }
  return data as T;
}

export async function loginApi(
  username: string,
  password: string
): Promise<{ accessToken: string; user: UserInfo }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(res);
}

export async function listRequests(): Promise<FinancingRequest[]> {
  const res = await fetch(`${API_BASE}/api/financing-requests`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function createRequest(
  form: FinancingFormData
): Promise<FinancingRequest> {
  const res = await fetch(`${API_BASE}/api/financing-requests`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      applicantName: form.applicantName,
      applicantIdentifier: form.applicantIdentifier,
      amount: Number(form.amount),
      durationMonths: Number(form.durationMonths),
      purpose: form.purpose,
      monthlyIncome: Number(form.monthlyIncome),
    }),
  });
  return handleResponse(res);
}

export async function updateRequest(
  id: number,
  form: FinancingFormData
): Promise<FinancingRequest> {
  const res = await fetch(`${API_BASE}/api/financing-requests/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({
      applicantName: form.applicantName,
      applicantIdentifier: form.applicantIdentifier,
      amount: Number(form.amount),
      durationMonths: Number(form.durationMonths),
      purpose: form.purpose,
      monthlyIncome: Number(form.monthlyIncome),
    }),
  });
  return handleResponse(res);
}

export async function submitRequest(id: number): Promise<FinancingRequest & { status: string }> {
  const res = await fetch(`${API_BASE}/api/financing-requests/${id}/submit`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function startReview(id: number): Promise<FinancingRequest> {
  const res = await fetch(`${API_BASE}/api/financing-requests/${id}/start-review`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function decideRequest(
  id: number,
  decision: 'APPROVED' | 'REJECTED',
  reason: string
): Promise<FinancingRequest> {
  const res = await fetch(`${API_BASE}/api/financing-requests/${id}/decision`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ decision, reason }),
  });
  return handleResponse(res);
}

export async function getAgentStats(): Promise<AgentStats> {
  const res = await fetch(`${API_BASE}/api/financing-requests/stats/agent`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function getManagerKpis(): Promise<ManagerKpis> {
  const res = await fetch(`${API_BASE}/api/financing-requests/stats/manager`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}
