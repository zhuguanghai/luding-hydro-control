import { Navigate, Route, Routes, useLocation } from 'react-router';
import { getSession, canManage } from './engine/auth';
import './App.css';
import Login from './pages/Login';
import Screen from './pages/Screen';
import AdminLayout from './pages/admin/AdminLayout';
import Sensors from './pages/admin/Sensors';
import Gates from './pages/admin/Gates';
import Weather from './pages/admin/Weather';
import Inflow from './pages/admin/Inflow';
import Dispatch from './pages/admin/Dispatch';
import Manage from './pages/admin/Manage';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const loc = useLocation();
  if (!getSession()) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const user = getSession();
  if (!canManage(user)) return <Navigate to="/admin/gates" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={getSession() ? '/screen' : '/login'} replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/screen"
        element={
          <RequireAuth>
            <Screen />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/admin/gates" replace />} />
        <Route path="sensors" element={<Sensors />} />
        <Route path="gates" element={<Gates />} />
        <Route path="weather" element={<Weather />} />
        <Route path="inflow" element={<Inflow />} />
        <Route path="dispatch" element={<Dispatch />} />
        <Route
          path="manage"
          element={
            <RequireAdmin>
              <Manage />
            </RequireAdmin>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
