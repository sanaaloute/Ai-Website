import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  listAllAppointments,
  updateAppointmentsStatus,
  deleteAppointments,
  type Appointments,
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
  { value: 'pending', label: 'pending' },
  { value: 'confirmed', label: 'confirmed' },
  { value: 'cancelled', label: 'cancelled' },
  { value: 'completed', label: 'completed' }
];

const PER_PAGE = 10;

export default function AdminAppointments() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Appointments[]>([]);
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
      const r = await listAllAppointments(currentPage, PER_PAGE, { search: currentSearch || undefined });
      setItems(r.items);
      setTotalItems(r.totalItems);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load appointments',
        message: err instanceof Error ? err.message : 'Could not load appointments.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const handleStatusChange = async (id: string, status: Appointments['status']) => {
    try {
      await updateAppointmentsStatus(id, status);
      addToast({ variant: 'success', title: 'Updated', message: 'Appointment status updated.' });
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
      await deleteAppointments(deletingId);
      addToast({ variant: 'success', title: 'Deleted', message: 'Appointment deleted successfully.' });
      await load();
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Failed to delete appointment.',
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Appointments" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search appointments..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:w-80"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} columns={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No appointments"
          message={search ? 'No appointments match your search.' : 'Appointments will appear here once customers book them.'}
        />
      ) : (
        <TableContainer>
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-700">ID</th>
                <th className="px-6 py-3 font-medium text-gray-700">User</th>
                <th className="px-6 py-3 font-medium text-gray-700">Service</th>
                <th className="px-6 py-3 font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">#{r.id.slice(-6)}</td>
                  <td className="px-6 py-4 text-gray-600">{r.expand?.user?.email || r.user}</td>
                  <td className="px-6 py-4 text-gray-600">{r.expand?.service?.name || r.service || '-'}</td>
                  <td className="px-6 py-4">
                    <Select
                      options={STATUS_OPTIONS}
                      value={r.status as string}
                      onChange={(e) => handleStatusChange(r.id, e.target.value as Appointments['status'])}
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
        title="Delete appointment"
        message="Are you sure you want to delete this appointment? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="destructive"
        loading={deleting}
      />
    </div>
  );
}
