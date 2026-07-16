import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import Home from '@/pages/Home';
import { AdminLayout } from '@/admin/components/AdminLayout';
import { AdminRouteGuard } from '@/admin/components/AdminRouteGuard';
import AdminLogin from '@/admin/pages/Login';
import AdminDashboard from '@/admin/pages/Dashboard';
import AdminProducts from '@/admin/pages/Products';
import AdminCategories from '@/admin/pages/Categories';
import AdminOrders from '@/admin/pages/Orders';
import AdminUsers from '@/admin/pages/Users';
import AdminReviews from '@/admin/pages/Reviews';
import AdminSettings from '@/admin/pages/Settings';

export default function App() {
  return (
    <Routes>
      {/* Storefront routes */}
      <Route path="/" element={<Home />} />

      {/* Admin routes */}
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
            path="/admin/products"
            element={
              <ErrorBoundary>
                <AdminProducts />
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
            path="/admin/orders"
            element={
              <ErrorBoundary>
                <AdminOrders />
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
            path="/admin/reviews"
            element={
              <ErrorBoundary>
                <AdminReviews />
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

      {/* Unknown routes fall back to the storefront */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
