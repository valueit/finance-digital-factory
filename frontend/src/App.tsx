import { Navigate } from 'react-router-dom';
import { useAuth } from './auth';
import { AgentDashboard } from './pages/AgentDashboard';
import { AnalystDashboard } from './pages/AnalystDashboard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { LoginPage } from './pages/LoginPage';

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-name">Finance Digital Factory</div>
          <div className="brand-sub">Credit request orchestration</div>
        </div>
        {user ? (
          <div className="user-meta">
            <span>{user.username}</span>
            <span className="role-pill">{user.role}</span>
            <button
              type="button"
              className="btn btn-ghost"
              data-testid="logout-button"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        ) : null}
      </header>
      <main className="main">{children}</main>
    </div>
  );
}

function Home() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'AGENT') {
    return (
      <Shell>
        <AgentDashboard />
      </Shell>
    );
  }
  if (user.role === 'ANALYST') {
    return (
      <Shell>
        <AnalystDashboard />
      </Shell>
    );
  }
  return (
    <Shell>
      <ManagerDashboard />
    </Shell>
  );
}

export default function App() {
  return (
    <>
      <Home />
    </>
  );
}

export { LoginPage };
