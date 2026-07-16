import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  listAllApplications,
  updateApplicationsStatus,
  deleteApplications,
  type Applications,
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
  { value: 'pending', label: 'pending' },
  { value: 'reviewed', label: 'reviewed' },
  { value: 'accepted', label: 'accepted' },
  { value: 'rejected', label: 'rejected' },
];

const PER_PAGE = 10;

export default function AdminApplications() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Applications[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (currentPage = page, currentSearch = search) => {
    setLoading(true);
    try {
      const r = await listAllApplications(currentPage, PER_PAGE, {
        search: currentSearch || undefined,
      });
      setItems(r.items);
      setTotalItems(r.totalItems);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load applications',
        message: err instanceof Error ? err.message : 'Could not fetch applications.',
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

  const handleStatusChange = async (id: string, status: Applications['status']) => {
    try {
      await updateApplicationsStatus(id, status);
      addToast({ variant: 'success', title: 'Updated', message: 'Application status updated.' });
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
      await deleteApplications(deleteId);
      addToast({ variant: 'success', title: 'Deleted', message: 'Application has been deleted.' });
      await load(page, search);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Could not delete application.',
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Applications" />

      <div className="mb-4">
        <SearchInput
          placeholder="Search applications..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          wrapperClassName="w-full sm:w-80"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No applications"
          message={search ? 'No applications match your search.' : 'There are no applications yet.'}
        />
      ) : (
        <TableContainer>
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-700">ID</th>
                <th className="px-6 py-3 font-medium text-gray-700">User</th>
                <th className="px-6 py-3 font-medium text-gray-700">Job</th>
                <th className="px-6 py-3 font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">#{r.id.slice(-6)}</td>
                  <td className="px-6 py-4 text-gray-600">{r.expand?.user?.email || r.user}</td>
                  <td className="px-6 py-4 text-gray-600">{r.expand?.job?.title || r.job || '-'}</td>
                  <td className="px-6 py-4">
                    <Select
                      options={STATUS_OPTIONS}
                      value={r.status as string}
                      onChange={(e) => handleStatusChange(r.id, e.target.value as Applications['status'])}
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
        title="Delete application"
        message="Are you sure you want to delete this application? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
