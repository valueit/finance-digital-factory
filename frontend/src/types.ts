export type Role = 'AGENT' | 'ANALYST' | 'MANAGER';

export type FinancingStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export interface UserInfo {
  username: string;
  role: Role;
}

export interface FinancingRequest {
  id: number;
  reference: string;
  applicantName: string;
  applicantIdentifier: string;
  amount: number;
  durationMonths: number;
  purpose: string;
  monthlyIncome: number;
  status: FinancingStatus;
  createdBy: number;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentStats {
  drafts: number;
  submitted: number;
  approved: number;
}

export interface ManagerKpis {
  totalRequests: number;
  byStatus: Record<FinancingStatus, number>;
  totalAmountRequested: number;
  acceptanceRate: number;
}

export interface FinancingFormData {
  applicantName: string;
  applicantIdentifier: string;
  amount: string;
  durationMonths: string;
  purpose: string;
  monthlyIncome: string;
}
