import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import Layout from './components/Layout.js';
import Login from './pages/Login.js';
import Dashboard from './pages/Dashboard.js';
import Board from './pages/Board.js';
import Tasks from './pages/Tasks.js';
import Contacts from './pages/Contacts.js';
import Companies from './pages/Companies.js';
import Webhooks from './pages/Webhooks.js';
import Users from './pages/Users.js';
import Settings from './pages/Settings.js';
import Reports from './pages/Reports.js';
import PublicProposal from './pages/PublicProposal.js';
import Automations from './pages/Automations.js';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/p/:token" element={<PublicProposal />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/board" element={<Board />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/automations" element={<Automations />} />
              <Route path="/webhooks" element={<Webhooks />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
