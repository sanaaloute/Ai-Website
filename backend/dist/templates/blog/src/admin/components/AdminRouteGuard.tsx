import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { currentUser, isAuthenticated } from '@/lib/pocketbase';

export function AdminRouteGuard() {
  const location = useLocation();
  const user = currentUser();

  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-lg font-semibold text-red-900">Access denied</h1>
          <p className="mt-2 text-sm text-red-700">
            You do not have permission to access the admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
