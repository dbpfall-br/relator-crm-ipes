import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { ApiError } from '../lib/api.js';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@relator.dev');
  const [password, setPassword] = useState('admin12345');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="logo-big">R</div>
        <h2 style={{ margin: '0 0 4px' }}>Relator CRM IPES</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
          Entre para acessar seu pipeline de vendas.
        </p>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="muted" style={{ fontSize: 12, marginTop: 16, textAlign: 'center' }}>
          Seed: admin@relator.dev / admin12345
        </p>
      </form>
    </div>
  );
}
