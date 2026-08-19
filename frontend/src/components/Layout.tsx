import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { initials } from '../lib/format.js';

const links = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/board', label: 'Pipeline', icon: '📋' },
  { to: '/tasks', label: 'Tarefas', icon: '✅' },
  { to: '/reports', label: 'Analisar', icon: '📈' },
  { to: '/contacts', label: 'Contatos', icon: '👤' },
  { to: '/companies', label: 'Empresas', icon: '🏢' },
  { to: '/users', label: 'Usuários', icon: '👥', adminOnly: true },
  { to: '/automations', label: 'Automações', icon: '⚡', adminOnly: true },
  { to: '/settings', label: 'Configurações', icon: '⚙️', adminOnly: true },
  { to: '/webhooks', label: 'Webhooks', icon: '🔌', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">R</span>
          Relator CRM IPES
        </div>
        {links
          .filter((l) => !l.adminOnly || user?.role === 'ADMIN')
          .map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
        <div className="spacer" />
        <div className="user-box">
          <div className="avatar">{user ? initials(user.name) : '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 600 }}>{user?.name}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{user?.role}</div>
          </div>
        </div>
        <button className="btn btn-ghost" style={{ color: '#cbd5e1', marginTop: 8 }} onClick={logout}>
          Sair
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
