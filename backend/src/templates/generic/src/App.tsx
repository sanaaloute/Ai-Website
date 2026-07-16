import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Home from '@/pages/Home';
import Notes from '@/pages/Notes';
import { AdminLayout } from '@/admin/components/AdminLayout';
import { AdminRouteGuard } from '@/admin/components/AdminRouteGuard';
import AdminLogin from '@/admin/pages/Login';
import AdminDashboard from '@/admin/pages/Dashboard';
import AdminPages from '@/admin/pages/Pages';
import AdminContacts from '@/admin/pages/Contacts';
import AdminUsers from '@/admin/pages/Users';
import AdminSettings from '@/admin/pages/Settings';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/notes"
            element={
              <ErrorBoundary>
                <Notes />
              </ErrorBoundary>
            }
          />

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
                path="/admin/pages"
                element={
                  <ErrorBoundary>
                    <AdminPages />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/admin/contacts"
                element={
                  <ErrorBoundary>
                    <AdminContacts />
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
      </main>
      <Footer />
    </div>
  );
}
