import { useEffect, useState } from 'react';
import { decideRequest, listRequests, startReview } from '../api/client';
import type { FinancingRequest } from '../types';

function formatAmount(value: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function AnalystDashboard() {
  const [requests, setRequests] = useState<FinancingRequest[]>([]);
  const [reason, setReason] = useState('Request meets eligibility criteria');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    setRequests(await listRequests());
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load queue')
    );
  }, []);

  async function onStartReview(id: number) {
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      await startReview(id);
      setSuccess('Review started');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start review');
    } finally {
      setBusyId(null);
    }
  }

  async function onDecide(id: number, decision: 'APPROVED' | 'REJECTED') {
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      await decideRequest(id, decision, reason);
      setSuccess(`Request ${decision.toLowerCase()}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply decision');
    } finally {
      setBusyId(null);
    }
  }

  const submitted = requests.filter((r) => r.status === 'SUBMITTED');
  const underReview = requests.filter((r) => r.status === 'UNDER_REVIEW');

  return (
    <div data-testid="analyst-dashboard">
      <h1 className="page-title">Analyst workspace</h1>
      <p className="page-subtitle">Review submitted financing requests and record decisions.</p>

      <div className="panel">
        <div className="panel-header">
          <h2>Decision reason</h2>
        </div>
        <div className="field">
          <label htmlFor="decision-reason">Reason</label>
          <textarea
            id="decision-reason"
            data-testid="decision-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>

      <div className="panel" data-testid="analyst-request-queue">
        <div className="panel-header">
          <h2>Submitted queue</h2>
        </div>
        {submitted.length === 0 ? (
          <div className="empty">No submitted requests.</div>
        ) : (
          submitted.map((req) => (
            <div className="queue-item" key={req.id}>
              <div>
                <strong data-testid="request-reference">{req.reference}</strong>
                <div className="queue-meta">
                  {req.applicantName} · {formatAmount(req.amount)} · {req.durationMonths} months
                </div>
                <div className="queue-meta">{req.purpose}</div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span className={`status status-${req.status}`} data-testid="request-status">
                    {req.status}
                  </span>
                </div>
              </div>
              <div className="queue-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  data-testid="start-review"
                  disabled={busyId === req.id}
                  onClick={() => void onStartReview(req.id)}
                >
                  Start review
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Under review</h2>
        </div>
        {underReview.length === 0 ? (
          <div className="empty">No requests under review.</div>
        ) : (
          underReview.map((req) => (
            <div className="queue-item" key={req.id}>
              <div>
                <strong>{req.reference}</strong>
                <div className="queue-meta">
                  {req.applicantName} · {formatAmount(req.amount)} · income{' '}
                  {formatAmount(req.monthlyIncome)}
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span className={`status status-${req.status}`}>{req.status}</span>
                </div>
              </div>
              <div className="queue-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  data-testid="approve-request"
                  disabled={busyId === req.id}
                  onClick={() => void onDecide(req.id, 'APPROVED')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  data-testid="reject-request"
                  disabled={busyId === req.id}
                  onClick={() => void onDecide(req.id, 'REJECTED')}
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {success ? (
        <div className="message message-success" data-testid="success-message">
          {success}
        </div>
      ) : null}
      {error ? (
        <div className="message message-error" data-testid="validation-error">
          {error}
        </div>
      ) : null}
    </div>
  );
}
