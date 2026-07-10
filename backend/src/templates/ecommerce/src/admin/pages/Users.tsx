import { useEffect, useMemo, useState } from 'react';
import { listAllUsers, updateUserRole, type User } from '@/lib/pocketbase';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  PageHeader,
  SkeletonTable,
  EmptyState,
  SearchInput,
  Pagination,
  ConfirmDialog,
} from '@/admin/components/ui';
import { useToast } from '@/hooks/useToast';

const ROLE_OPTIONS = [
  { value: 'all', label: 'All roles' },
  { value: 'customer', label: 'Customer' },
  { value: 'admin', label: 'Admin' },
];

const USER_ROLE_OPTIONS = [
  { value: 'customer', label: 'Customer' },
  { value: 'admin', label: 'Admin' },
];

const PER_PAGE = 10;

export default function AdminUsers() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<User['role'] | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: User; role: User['role'] } | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async (targetPage = page) => {
    setLoading(true);
    try {
      const u = await listAllUsers(targetPage, PER_PAGE, {
        search: search || undefined,
        role: roleFilter,
      });
      setUsers(u.items);
      setTotalItems(u.totalItems);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load users',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, roleFilter]);

  const handleRoleChange = async () => {
    if (!pendingRoleChange) return;
    const { user, role } = pendingRoleChange;
    setPendingRoleChange(null);
    setUpdating(user.id);
    try {
      await updateUserRole(user.id, role);
      await load();
      addToast({ variant: 'success', title: 'Role updated', message: `${user.email} is now ${role}.` });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Update failed',
        message: err instanceof Error ? err.message : 'Could not update user',
      });
    } finally {
      setUpdating(null);
    }
  };

  const debouncedSearch = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setPage(1);
        setSearch(value);
      }, 300);
    };
  }, []);

  return (
    <div>
      <PageHeader title="Users" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search by email or name..."
          defaultValue={search}
          onChange={(e) => debouncedSearch(e.target.value)}
          wrapperClassName="w-full sm:w-80"
        />
        <Select
          options={ROLE_OPTIONS}
          value={roleFilter}
          onChange={(e) => {
            setPage(1);
            setRoleFilter(e.target.value as User['role'] | 'all');
          }}
          className="w-full sm:w-48"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} columns={4} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users found"
          message={search || roleFilter !== 'all' ? 'Try changing your filters.' : 'No users have signed up yet.'}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-700">Email</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Name</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Role</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-700">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{u.email}</td>
                    <td className="px-6 py-4 text-gray-600">{u.name || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={u.role === 'admin' ? 'accent' : 'default'}>{u.role || 'customer'}</Badge>
                        <Select
                          options={USER_ROLE_OPTIONS}
                          value={u.role || 'customer'}
                          disabled={updating === u.id}
                          onChange={(e) =>
                            setPendingRoleChange({ user: u, role: e.target.value as User['role'] })
                          }
                          className="w-32"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {new Date(u.created).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} perPage={PER_PAGE} totalItems={totalItems} onPageChange={setPage} />
        </div>
      )}

      <ConfirmDialog
        open={!!pendingRoleChange}
        onClose={() => setPendingRoleChange(null)}
        onConfirm={handleRoleChange}
        title="Change user role"
        message={`Are you sure you want to change ${pendingRoleChange?.user.email} to ${pendingRoleChange?.role}?`}
        confirmText="Change role"
        confirmVariant="primary"
      />
    </div>
  );
}
