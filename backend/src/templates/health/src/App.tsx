import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import Home from '@/pages/Home';
import { AdminLayout } from '@/admin/components/AdminLayout';
import { AdminRouteGuard } from '@/admin/components/AdminRouteGuard';
import AdminLogin from '@/admin/pages/Login';
import AdminDashboard from '@/admin/pages/Dashboard';
import AdminServices from '@/admin/pages/Services';
import AdminCategories from '@/admin/pages/Categories';
import AdminAppointments from '@/admin/pages/Appointments';
import AdminUsers from '@/admin/pages/Users';
import AdminSettings from '@/admin/pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<AdminRouteGuard />}>
        <Route element={<AdminLayout />}>
          <Route
            path="/admin"
            element={
              <ErrorBoundary>
                <AdminDashboard />
              </ErrorBoundary>
            }
          />
          <Route
            path="/admin/services"
            element={
              <ErrorBoundary>
                <AdminServices />
              </ErrorBoundary>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ErrorBoundary>
                <AdminCategories />
              </ErrorBoundary>
            }
          />
          <Route
            path="/admin/appointments"
            element={
              <ErrorBoundary>
                <AdminAppointments />
              </ErrorBoundary>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ErrorBoundary>
                <AdminUsers />
              </ErrorBoundary>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ErrorBoundary>
                <AdminSettings />
              </ErrorBoundary>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
