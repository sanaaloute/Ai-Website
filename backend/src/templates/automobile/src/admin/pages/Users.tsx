import { useEffect, useState, useCallback } from 'react';
import { listAllUsers, updateUserRole, type User } from '@/lib/pocketbase';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  PageHeader,
  SkeletonTable,
  EmptyState,
  SearchInput,
  Pagination,
  TableContainer,
} from '@/admin/components/ui';
import { useToast } from '@/hooks/useToast';

const ROLE_OPTIONS = [
  { value: 'customer', label: 'Customer' },
  { value: 'admin', label: 'Admin' },
];

const PER_PAGE = 10;

export default function AdminUsers() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = await listAllUsers(page, PER_PAGE, { search: search.trim() || undefined });
      setUsers(u.items);
      setTotalItems(u.totalItems);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load users.';
      addToast({ variant: 'error', title: 'Failed to load users', message });
    } finally {
      setLoading(false);
    }
  }, [page, search, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRoleChange = async (id: string, role: User['role']) => {
    try {
      await updateUserRole(id, role);
      addToast({ variant: 'success', title: 'Updated', message: 'User role updated.' });
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user.';
      addToast({ variant: 'error', title: 'Update failed', message });
    }
  };

  return (
    <div>
      <PageHeader title="Users" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search users..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          wrapperClassName="sm:w-72"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} columns={4} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users"
          message={search ? 'No users match your search.' : 'There are no users yet.'}
        />
      ) : (
        <TableContainer>
          <table className="w-full text-left text-sm">
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
                <tr key={u.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{u.email}</td>
                  <td className="px-6 py-4 text-gray-600">{u.name || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={u.role === 'admin' ? 'accent' : 'default'}>{u.role || 'customer'}</Badge>
                      <Select
                        options={ROLE_OPTIONS}
                        value={u.role || 'customer'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as User['role'])}
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
          <Pagination page={page} perPage={PER_PAGE} totalItems={totalItems} onPageChange={setPage} />
        </TableContainer>
      )}
    </div>
  );
}
