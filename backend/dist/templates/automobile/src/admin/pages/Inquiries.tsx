import { useEffect, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import {
  listAllInquiries,
  updateInquiriesStatus,
  deleteInquiries,
  type Inquiries,
} from '@/lib/pocketbase';
import { Button } from '@/components/ui/Button';
import {
  Select,
  PageHeader,
  SkeletonTable,
  EmptyState,
  SearchInput,
  Pagination,
  ConfirmDialog,
  TableContainer,
} from '@/admin/components/ui';
import { useToast } from '@/hooks/useToast';

const STATUS_OPTIONS = [
  { value: 'new', label: 'new' },
  { value: 'contacted', label: 'contacted' },
  { value: 'closed', label: 'closed' }
];

const PER_PAGE = 10;

export default function AdminInquiries() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Inquiries[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listAllInquiries(page, PER_PAGE, { search: search.trim() || undefined });
      setItems(r.items);
      setTotalItems(r.totalItems);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load inquiries.';
      addToast({ variant: 'error', title: 'Failed to load inquiries', message });
    } finally {
      setLoading(false);
    }
  }, [page, search, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, status: Inquiries['status']) => {
    try {
      await updateInquiriesStatus(id, status);
      addToast({ variant: 'success', title: 'Updated', message: 'Inquiry status updated.' });
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status.';
      addToast({ variant: 'error', title: 'Update failed', message });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteInquiries(deleteId);
      addToast({ variant: 'success', title: 'Deleted', message: 'Inquiry deleted successfully.' });
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete inquiry.';
      addToast({ variant: 'error', title: 'Delete failed', message });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Inquiries" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search inquiries..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          wrapperClassName="sm:w-72"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} columns={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No inquiries"
          message={search ? 'No inquiries match your search.' : 'There are no inquiries yet.'}
        />
      ) : (
        <TableContainer>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-700">ID</th>
                <th className="px-6 py-3 font-medium text-gray-700">User</th>
                <th className="px-6 py-3 font-medium text-gray-700">Listing</th>
                <th className="px-6 py-3 font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">#{r.id.slice(-6)}</td>
                  <td className="px-6 py-4 text-gray-600">{r.expand?.user?.email || r.user}</td>
                  <td className="px-6 py-4 text-gray-600">{r.expand?.listing?.name || r.listing || '-'}</td>
                  <td className="px-6 py-4">
                    <Select
                      options={STATUS_OPTIONS}
                      value={r.status as string}
                      onChange={(e) => handleStatusChange(r.id, e.target.value as Inquiries['status'])}
                      className="w-40"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(r.id)}>
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
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete inquiry"
        message="Are you sure you want to delete this inquiry? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
