import { useEffect, useState } from 'react';
import { getManagerKpis, listRequests } from '../api/client';
import type { FinancingRequest, FinancingStatus, ManagerKpis } from '../types';

function formatAmount(value: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(value);
}

const emptyKpis: ManagerKpis = {
  totalRequests: 0,
  byStatus: {
    DRAFT: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
  },
  totalAmountRequested: 0,
  acceptanceRate: 0,
};

export function ManagerDashboard() {
  const [kpis, setKpis] = useState<ManagerKpis>(emptyKpis);
  const [requests, setRequests] = useState<FinancingRequest[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.all([getManagerKpis(), listRequests()])
      .then(([kpiData, reqData]) => {
        setKpis(kpiData);
        setRequests(reqData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load KPIs'));
  }, []);

  const statuses = Object.keys(kpis.byStatus) as FinancingStatus[];

  return (
    <div data-testid="manager-dashboard">
      <h1 className="page-title">Manager overview</h1>
      <p className="page-subtitle">Portfolio KPIs across all financing requests.</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total requests</div>
          <div className="stat-value">{kpis.totalRequests}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total amount</div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>
            {formatAmount(kpis.totalAmountRequested)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Acceptance rate</div>
          <div className="stat-value">{kpis.acceptanceRate}%</div>
        </div>
      </div>

      <div className="stats-grid">
        {statuses.map((status) => (
          <div className="stat-card" key={status}>
            <div className="stat-label">{status.replace('_', ' ')}</div>
            <div className="stat-value">{kpis.byStatus[status]}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>All financing requests</h2>
        </div>
        <div className="table-wrap">
          <table aria-label="All financing requests">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Applicant</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>{req.reference}</td>
                  <td>{req.applicantName}</td>
                  <td>{formatAmount(req.amount)}</td>
                  <td>
                    <span className={`status status-${req.status}`}>{req.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error ? (
        <div className="message message-error" data-testid="validation-error">
          {error}
        </div>
      ) : null}
    </div>
  );
}
