import { db } from '../db/connection.js';
import type {
  AuthUser,
  CreateFinancingRequestBody,
  FinancingRequest,
  FinancingStatus,
} from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';

const ALLOWED_DURATIONS = [12, 24, 36, 48, 60];
const MIN_AMOUNT = 10000;
const MAX_AMOUNT = 500000;

const ALLOWED_TRANSITIONS: Record<FinancingStatus, FinancingStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

function toApi(row: FinancingRequest) {
  return {
    id: row.id,
    reference: row.reference,
    applicantName: row.applicant_name,
    applicantIdentifier: row.applicant_identifier,
    amount: row.amount,
    durationMonths: row.duration_months,
    purpose: row.purpose,
    monthlyIncome: row.monthly_income,
    status: row.status,
    createdBy: row.created_by,
    decisionReason: row.decision_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `FDF-${stamp}-${rand}`;
}

function validateRequiredFields(body: CreateFinancingRequestBody, requireAmount = true): void {
  if (!body.applicantName?.trim()) {
    throw new AppError(400, 'APPLICANT_NAME_REQUIRED', 'Applicant name is required');
  }
  if (!body.applicantIdentifier?.trim()) {
    throw new AppError(400, 'APPLICANT_IDENTIFIER_REQUIRED', 'Applicant identifier is required');
  }
  if (requireAmount && (body.amount === undefined || body.amount === null)) {
    throw new AppError(400, 'AMOUNT_REQUIRED', 'Amount is required');
  }
  if (body.amount !== undefined && body.amount !== null) {
    if (
      typeof body.amount !== 'number' ||
      Number.isNaN(body.amount) ||
      body.amount < MIN_AMOUNT ||
      body.amount > MAX_AMOUNT
    ) {
      throw new AppError(
        400,
        'INVALID_AMOUNT',
        'Amount must be between 10000 and 500000 MAD'
      );
    }
  }
  if (body.durationMonths === undefined || body.durationMonths === null) {
    throw new AppError(400, 'DURATION_REQUIRED', 'Duration is required');
  }
  if (!ALLOWED_DURATIONS.includes(body.durationMonths)) {
    throw new AppError(
      400,
      'INVALID_DURATION',
      'Duration must be one of: 12, 24, 36, 48, 60'
    );
  }
  if (!body.purpose?.trim()) {
    throw new AppError(400, 'PURPOSE_REQUIRED', 'Purpose is required');
  }
  if (body.monthlyIncome === undefined || body.monthlyIncome === null) {
    throw new AppError(400, 'MONTHLY_INCOME_REQUIRED', 'Monthly income is required');
  }
  if (typeof body.monthlyIncome !== 'number' || body.monthlyIncome <= 0) {
    throw new AppError(400, 'INVALID_MONTHLY_INCOME', 'Monthly income must be a positive number');
  }
}

function getRequestOrThrow(id: number): FinancingRequest {
  const row = db
    .prepare('SELECT * FROM financing_requests WHERE id = ?')
    .get(id) as FinancingRequest | undefined;
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', `Financing request ${id} not found`);
  }
  return row;
}

function assertTransition(from: FinancingStatus, to: FinancingStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new AppError(
      400,
      'INVALID_TRANSITION',
      `Cannot transition from ${from} to ${to}`
    );
  }
}

export function createRequest(user: AuthUser, body: CreateFinancingRequestBody) {
  if (user.role !== 'AGENT') {
    throw new AppError(403, 'FORBIDDEN', 'Only agents can create financing requests');
  }

  validateRequiredFields(body, true);

  const reference = generateReference();
  const result = db
    .prepare(
      `INSERT INTO financing_requests (
        reference, applicant_name, applicant_identifier, amount,
        duration_months, purpose, monthly_income, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`
    )
    .run(
      reference,
      body.applicantName!.trim(),
      body.applicantIdentifier!.trim(),
      body.amount,
      body.durationMonths,
      body.purpose!.trim(),
      body.monthlyIncome,
      user.id
    );

  return toApi(getRequestOrThrow(Number(result.lastInsertRowid)));
}

export function listRequests(user: AuthUser) {
  let rows: FinancingRequest[];

  if (user.role === 'AGENT') {
    rows = db
      .prepare('SELECT * FROM financing_requests WHERE created_by = ? ORDER BY id DESC')
      .all(user.id) as FinancingRequest[];
  } else if (user.role === 'ANALYST') {
    rows = db
      .prepare(
        `SELECT * FROM financing_requests
         WHERE status IN ('SUBMITTED', 'UNDER_REVIEW')
         ORDER BY id DESC`
      )
      .all() as FinancingRequest[];
  } else {
    rows = db
      .prepare('SELECT * FROM financing_requests ORDER BY id DESC')
      .all() as FinancingRequest[];
  }

  return rows.map(toApi);
}

export function getRequest(user: AuthUser, id: number) {
  const row = getRequestOrThrow(id);

  if (user.role === 'AGENT' && row.created_by !== user.id) {
    throw new AppError(403, 'FORBIDDEN', 'You can only view your own requests');
  }

  return toApi(row);
}

export function updateRequest(
  user: AuthUser,
  id: number,
  body: CreateFinancingRequestBody
) {
  const row = getRequestOrThrow(id);

  if (user.role !== 'AGENT' || row.created_by !== user.id) {
    throw new AppError(403, 'FORBIDDEN', 'Only the owning agent can modify a draft');
  }
  if (row.status !== 'DRAFT') {
    throw new AppError(400, 'NOT_EDITABLE', 'Only DRAFT requests can be modified');
  }

  validateRequiredFields(
    {
      applicantName: body.applicantName ?? row.applicant_name,
      applicantIdentifier: body.applicantIdentifier ?? row.applicant_identifier,
      amount: body.amount ?? row.amount,
      durationMonths: body.durationMonths ?? row.duration_months,
      purpose: body.purpose ?? row.purpose,
      monthlyIncome: body.monthlyIncome ?? row.monthly_income,
    },
    true
  );

  db.prepare(
    `UPDATE financing_requests SET
      applicant_name = ?,
      applicant_identifier = ?,
      amount = ?,
      duration_months = ?,
      purpose = ?,
      monthly_income = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    (body.applicantName ?? row.applicant_name).trim(),
    (body.applicantIdentifier ?? row.applicant_identifier).trim(),
    body.amount ?? row.amount,
    body.durationMonths ?? row.duration_months,
    (body.purpose ?? row.purpose).trim(),
    body.monthlyIncome ?? row.monthly_income,
    id
  );

  return toApi(getRequestOrThrow(id));
}

export function submitRequest(user: AuthUser, id: number) {
  const row = getRequestOrThrow(id);

  if (user.role !== 'AGENT' || row.created_by !== user.id) {
    throw new AppError(403, 'FORBIDDEN', 'Only the owning agent can submit a request');
  }

  assertTransition(row.status, 'SUBMITTED');

  db.prepare(
    `UPDATE financing_requests SET status = 'SUBMITTED', updated_at = datetime('now') WHERE id = ?`
  ).run(id);

  const updated = toApi(getRequestOrThrow(id));
  return { ...updated, status: 'SUBMITTED' as const };
}

export function startReview(user: AuthUser, id: number) {
  if (user.role !== 'ANALYST') {
    throw new AppError(403, 'FORBIDDEN', 'Only analysts can start a review');
  }

  const row = getRequestOrThrow(id);
  assertTransition(row.status, 'UNDER_REVIEW');

  db.prepare(
    `UPDATE financing_requests SET status = 'UNDER_REVIEW', updated_at = datetime('now') WHERE id = ?`
  ).run(id);

  const updated = toApi(getRequestOrThrow(id));
  return { ...updated, status: 'UNDER_REVIEW' as const };
}

export function decideRequest(
  user: AuthUser,
  id: number,
  decision: 'APPROVED' | 'REJECTED',
  reason: string
) {
  if (user.role !== 'ANALYST') {
    throw new AppError(403, 'FORBIDDEN', 'Only analysts can decide on a request');
  }
  if (!reason?.trim()) {
    throw new AppError(400, 'REASON_REQUIRED', 'Decision reason is required');
  }
  if (decision !== 'APPROVED' && decision !== 'REJECTED') {
    throw new AppError(400, 'INVALID_DECISION', 'Decision must be APPROVED or REJECTED');
  }

  const row = getRequestOrThrow(id);
  assertTransition(row.status, decision);

  db.prepare(
    `UPDATE financing_requests
     SET status = ?, decision_reason = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(decision, reason.trim(), id);

  return toApi(getRequestOrThrow(id));
}

export function getManagerKpis() {
  const rows = db
    .prepare('SELECT status, amount FROM financing_requests')
    .all() as Array<{ status: FinancingStatus; amount: number }>;

  const byStatus: Record<FinancingStatus, number> = {
    DRAFT: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
  };

  let totalAmount = 0;
  for (const row of rows) {
    byStatus[row.status] += 1;
    totalAmount += row.amount;
  }

  const decided = byStatus.APPROVED + byStatus.REJECTED;
  const acceptanceRate = decided === 0 ? 0 : Math.round((byStatus.APPROVED / decided) * 1000) / 10;

  return {
    totalRequests: rows.length,
    byStatus,
    totalAmountRequested: totalAmount,
    acceptanceRate,
  };
}

export function getAgentStats(userId: number) {
  const rows = db
    .prepare('SELECT status FROM financing_requests WHERE created_by = ?')
    .all(userId) as Array<{ status: FinancingStatus }>;

  return {
    drafts: rows.filter((r) => r.status === 'DRAFT').length,
    submitted: rows.filter((r) =>
      ['SUBMITTED', 'UNDER_REVIEW'].includes(r.status)
    ).length,
    approved: rows.filter((r) => r.status === 'APPROVED').length,
  };
}
