import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  listAllMessages,
  updateMessagesStatus,
  deleteMessages,
  type Messages,
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
  { value: 'replied', label: 'replied' },
  { value: 'closed', label: 'closed' },
];

const PER_PAGE = 10;

export default function AdminMessages() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Messages[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (currentPage = page, currentSearch = search) => {
    setLoading(true);
    try {
      const r = await listAllMessages(currentPage, PER_PAGE, {
        search: currentSearch || undefined,
      });
      setItems(r.items);
      setTotalItems(r.totalItems);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load messages',
        message: err instanceof Error ? err.message : 'Could not fetch messages.',
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

  const handleStatusChange = async (id: string, status: Messages['status']) => {
    try {
      await updateMessagesStatus(id, status);
      addToast({ variant: 'success', title: 'Updated', message: 'Message status updated.' });
      await load(page, search);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Update failed',
        message: err instanceof Error ? err.message : 'Could not update status.',
      });
    }
  };

  const confirmDelete = (id: string) => setDeleteId(id);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteMessages(deleteId);
      addToast({ variant: 'success', title: 'Deleted', message: 'Message has been deleted.' });
      await load(page, search);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Could not delete message.',
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Messages" />

      <div className="mb-4">
        <SearchInput
          placeholder="Search messages..."
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
      ) : items.length === 0 ? (
        <EmptyState
          title="No messages"
          message={search ? 'No messages match your search.' : 'There are no messages yet.'}
        />
      ) : (
        <TableContainer>
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-700">ID</th>
                <th className="px-6 py-3 font-medium text-gray-700">From</th>
                <th className="px-6 py-3 font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">#{r.id.slice(-6)}</td>
                  <td className="px-6 py-4 text-gray-600">{r.email || r.expand?.user?.email || r.user || '-'}</td>
                  <td className="px-6 py-4">
                    <Select
                      options={STATUS_OPTIONS}
                      value={r.status as string}
                      onChange={(e) => handleStatusChange(r.id, e.target.value as Messages['status'])}
                      className="w-40"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => confirmDelete(r.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
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

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
