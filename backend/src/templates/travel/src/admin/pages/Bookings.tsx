import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  listAllBookings,
  updateBookingsStatus,
  deleteBookings,
  type Bookings,
} from '@/lib/pocketbase';
import { Button } from '@/components/ui/Button';
import {
  Select,
  PageHeader,
  SkeletonTable,
  EmptyState,
  Pagination,
  SearchInput,
  ConfirmDialog,
} from '@/admin/components/ui';
import { useToast } from '@/hooks/useToast';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

const PER_PAGE = 10;

export default function AdminBookings() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Bookings[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Bookings | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (targetPage = page) => {
    setLoading(true);
    try {
      const r = await listAllBookings(targetPage, PER_PAGE, {
        search: search || undefined,
        status: statusFilter,
      });
      setItems(r.items);
      setTotalItems(r.totalItems);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load bookings',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter]);

  const handleStatusChange = async (id: string, status: Bookings['status']) => {
    try {
      await updateBookingsStatus(id, status);
      await load();
      addToast({ variant: 'success', title: 'Status updated', message: 'Booking status has been updated.' });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Update failed',
        message: err instanceof Error ? err.message : 'Failed to update status',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBookings(deleteTarget.id);
      setDeleteTarget(null);
      await load();
      addToast({ variant: 'success', title: 'Deleted', message: 'Booking has been removed.' });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Could not delete booking',
      });
    } finally {
      setDeleting(false);
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
      <PageHeader title="Bookings" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search bookings..."
          defaultValue={search}
          onChange={(e) => debouncedSearch(e.target.value)}
          wrapperClassName="w-full sm:w-80"
        />
        <Select
          options={[{ value: 'all', label: 'All statuses' }, ...STATUS_OPTIONS]}
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="w-full sm:w-48"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} columns={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No bookings found"
          message={search || statusFilter !== 'all' ? 'Try a different search term or filter.' : 'No bookings have been submitted yet.'}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-700">ID</th>
                  <th className="px-6 py-3 font-medium text-gray-700">User</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Tour</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">#{r.id.slice(-6)}</td>
                    <td className="px-6 py-4 text-gray-600">{r.expand?.user?.email || r.user}</td>
                    <td className="px-6 py-4 text-gray-600">{r.expand?.tour?.name || r.tour || '-'}</td>
                    <td className="px-6 py-4">
                      <Select
                        options={STATUS_OPTIONS}
                        value={r.status as string}
                        onChange={(e) => handleStatusChange(r.id, e.target.value as Bookings['status'])}
                        className="w-40"
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(r)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
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
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete booking"
        message={`Are you sure you want to delete booking #${deleteTarget?.id.slice(-6)}? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="destructive"
        loading={deleting}
      />
    </div>
  );
}
