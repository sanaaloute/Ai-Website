import { useEffect, useState } from 'react';
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
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');

  const load = async (currentPage = page, currentSearch = search) => {
    setLoading(true);
    try {
      const u = await listAllUsers(currentPage, PER_PAGE, {
        search: currentSearch || undefined,
      });
      setUsers(u.items);
      setTotalItems(u.totalItems);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load users',
        message: err instanceof Error ? err.message : 'Could not fetch users.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    load(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleRoleChange = async (id: string, role: User['role']) => {
    try {
      await updateUserRole(id, role);
      addToast({ variant: 'success', title: 'Updated', message: 'User role updated.' });
      await load(page, search);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Update failed',
        message: err instanceof Error ? err.message : 'Could not update user.',
      });
    }
  };

  return (
    <div>
      <PageHeader title="Users" />

      <div className="mb-4">
        <SearchInput
          placeholder="Search users..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          wrapperClassName="w-full sm:w-80"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={4} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users"
          message={search ? 'No users match your search.' : 'There are no users yet.'}
        />
      ) : (
        <TableContainer>
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
          <Pagination
            page={page}
            perPage={PER_PAGE}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        </TableContainer>
      )}
    </div>
  );
}
