import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  listAllContacts,
  updateContactsStatus,
  deleteContacts,
  type Contacts,
} from '@/lib/pocketbase';
import { Button } from '@/components/ui/Button';
import {
  Select,
  PageHeader,
  SearchInput,
  SkeletonTable,
  EmptyState,
  ConfirmDialog,
  TableContainer,
  Pagination,
} from '@/admin/components/ui';
import { useToast } from '@/hooks/useToast';

const STATUS_OPTIONS = [
  { value: 'new', label: 'new' },
  { value: 'replied', label: 'replied' },
  { value: 'closed', label: 'closed' }
];

const PER_PAGE = 10;

export default function AdminContacts() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Contacts[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (currentPage = page, currentSearch = search) => {
    setLoading(true);
    try {
      const r = await listAllContacts(currentPage, PER_PAGE, { search: currentSearch || undefined });
      setItems(r.items);
      setTotalItems(r.totalItems);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load contacts',
        message: err instanceof Error ? err.message : 'Could not load contacts.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const handleStatusChange = async (id: string, status: Contacts['status']) => {
    try {
      await updateContactsStatus(id, status);
      addToast({ variant: 'success', title: 'Updated', message: 'Contact status updated.' });
      await load();
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Update failed',
        message: err instanceof Error ? err.message : 'Failed to update status.',
      });
    }
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await deleteContacts(deletingId);
      addToast({ variant: 'success', title: 'Deleted', message: 'Contact deleted successfully.' });
      await load();
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Failed to delete contact.',
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Contacts" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:w-80"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} columns={4} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No contacts"
          message={search ? 'No contacts match your search.' : 'Contact submissions will appear here.'}
        />
      ) : (
        <TableContainer>
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-700">ID</th>
                <th className="px-6 py-3 font-medium text-gray-700">User</th>
                <th className="px-6 py-3 font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">#{r.id.slice(-6)}</td>
                  <td className="px-6 py-4 text-gray-600">{r.expand?.user?.email || r.user}</td>
                  <td className="px-6 py-4">
                    <Select
                      options={STATUS_OPTIONS}
                      value={r.status as string}
                      onChange={(e) => handleStatusChange(r.id, e.target.value as Contacts['status'])}
                      className="w-40"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDelete(r.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} perPage={PER_PAGE} totalItems={totalItems} onPageChange={setPage} />
        </TableContainer>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete contact"
        message="Are you sure you want to delete this contact? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="destructive"
        loading={deleting}
      />
    </div>
  );
}
