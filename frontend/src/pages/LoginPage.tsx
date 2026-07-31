import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState('agent');
  const [password, setPassword] = useState('agent123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit} aria-label="Sign in">
        <h1>Finance Digital Factory</h1>
        <p>Sign in to manage financing requests.</p>

        <div className="field">
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            data-testid="login-username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            data-testid="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error ? (
          <div className="message message-error" data-testid="validation-error" role="alert">
            {error}
          </div>
        ) : null}

        <button
          className="btn btn-primary"
          type="submit"
          data-testid="login-submit"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="demo-hint">
          Demo accounts: agent / agent123 · analyst / analyst123 · manager / manager123
        </div>
      </form>
    </div>
  );
}
