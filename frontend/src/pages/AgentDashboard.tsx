import { FormEvent, useEffect, useState } from 'react';
import {
  createRequest,
  getAgentStats,
  listRequests,
  submitRequest,
  updateRequest,
} from '../api/client';
import type { AgentStats, FinancingFormData, FinancingRequest } from '../types';

const emptyForm: FinancingFormData = {
  applicantName: '',
  applicantIdentifier: '',
  amount: '',
  durationMonths: '36',
  purpose: '',
  monthlyIncome: '',
};

function formatAmount(value: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function AgentDashboard() {
  const [requests, setRequests] = useState<FinancingRequest[]>([]);
  const [stats, setStats] = useState<AgentStats>({ drafts: 0, submitted: 0, approved: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FinancingFormData>(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastStatus, setLastStatus] = useState('');
  const [lastReference, setLastReference] = useState('');
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const [req, st] = await Promise.all([listRequests(), getAgentStats()]);
    setRequests(req);
    setStats(st);
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    );
  }, []);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function openEdit(req: FinancingRequest) {
    setEditingId(req.id);
    setForm({
      applicantName: req.applicantName,
      applicantIdentifier: req.applicantIdentifier,
      amount: String(req.amount),
      durationMonths: String(req.durationMonths),
      purpose: req.purpose,
      monthlyIncome: String(req.monthlyIncome),
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  async function saveDraft(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const saved = editingId
        ? await updateRequest(editingId, form)
        : await createRequest(form);
      setEditingId(saved.id);
      setLastReference(saved.reference);
      setLastStatus(saved.status);
      setSuccess(`Draft saved (${saved.reference})`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      let requestId: number;
      if (editingId === null) {
        const created = await createRequest(form);
        requestId = created.id;
        setEditingId(created.id);
        setLastReference(created.reference);
      } else {
        await updateRequest(editingId, form);
        requestId = editingId;
      }
      const submitted = await submitRequest(requestId);
      setLastReference(submitted.reference);
      setLastStatus(submitted.status);
      setSuccess('Financing request submitted successfully');
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-testid="agent-dashboard">
      <h1 className="page-title">Agent workspace</h1>
      <p className="page-subtitle">Create, refine and submit financing requests.</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Drafts</div>
          <div className="stat-value">{stats.drafts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Submitted</div>
          <div className="stat-value">{stats.submitted}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value">{stats.approved}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>My financing requests</h2>
          <button
            type="button"
            className="btn btn-primary"
            data-testid="new-financing-request"
            onClick={openNew}
          >
            New financing request
          </button>
        </div>

        <div className="table-wrap">
          <table data-testid="requests-table" aria-label="Agent financing requests">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Applicant</th>
                <th>Amount</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    No requests yet.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    <td>{req.reference}</td>
                    <td>{req.applicantName}</td>
                    <td>{formatAmount(req.amount)}</td>
                    <td>{req.durationMonths} months</td>
                    <td>
                      <span className={`status status-${req.status}`}>{req.status}</span>
                    </td>
                    <td>
                      {req.status === 'DRAFT' ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => openEdit(req)}
                        >
                          Edit
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm ? (
        <div className="panel">
          <div className="panel-header">
            <h2>{editingId ? 'Edit financing request' : 'New financing request'}</h2>
          </div>
          <form onSubmit={submit} aria-label="Financing request form">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="applicant-name">Applicant name</label>
                <input
                  id="applicant-name"
                  data-testid="applicant-name"
                  value={form.applicantName}
                  onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="applicant-identifier">Applicant identifier</label>
                <input
                  id="applicant-identifier"
                  data-testid="applicant-identifier"
                  value={form.applicantIdentifier}
                  onChange={(e) =>
                    setForm({ ...form, applicantIdentifier: e.target.value })
                  }
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="financing-amount">Amount</label>
                <input
                  id="financing-amount"
                  data-testid="financing-amount"
                  type="number"
                  min={10000}
                  max={500000}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="financing-duration">Duration</label>
                <select
                  id="financing-duration"
                  data-testid="financing-duration"
                  value={form.durationMonths}
                  onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
                  required
                >
                  {[12, 24, 36, 48, 60].map((d) => (
                    <option key={d} value={d}>
                      {d} months
                    </option>
                  ))}
                </select>
              </div>
              <div className="field full">
                <label htmlFor="financing-purpose">Purpose</label>
                <input
                  id="financing-purpose"
                  data-testid="financing-purpose"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="monthly-income">Monthly income</label>
                <input
                  id="monthly-income"
                  data-testid="monthly-income"
                  type="number"
                  min={1}
                  value={form.monthlyIncome}
                  onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                data-testid="save-draft"
                disabled={loading}
                onClick={(e) => void saveDraft(e)}
              >
                Save draft
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                data-testid="submit-request"
                disabled={loading}
              >
                Submit request
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {success ? (
        <div className="message message-success" data-testid="success-message" role="status">
          {success}
          {lastReference ? (
            <>
              {' · '}
              <span data-testid="request-reference">{lastReference}</span>
            </>
          ) : null}
          {lastStatus ? (
            <>
              {' · '}
              <span data-testid="request-status">{lastStatus}</span>
            </>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <div className="message message-error" data-testid="validation-error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
