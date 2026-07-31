export type Role = 'AGENT' | 'ANALYST' | 'MANAGER';

export type FinancingStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  created_at: string;
}

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

export interface FinancingRequest {
  id: number;
  reference: string;
  applicant_name: string;
  applicant_identifier: string;
  amount: number;
  duration_months: number;
  purpose: string;
  monthly_income: number;
  status: FinancingStatus;
  created_by: number;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFinancingRequestBody {
  applicantName?: string;
  applicantIdentifier?: string;
  amount?: number;
  durationMonths?: number;
  purpose?: string;
  monthlyIncome?: number;
}

export interface DecisionBody {
  decision?: 'APPROVED' | 'REJECTED';
  reason?: string;
}

export interface ApiError {
  code: string;
  message: string;
}
