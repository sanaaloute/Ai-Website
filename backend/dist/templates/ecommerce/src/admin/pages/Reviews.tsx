import { useEffect, useMemo, useState } from 'react';
import { Trash2, Star } from 'lucide-react';
import { listAllReviews, deleteReview, type Review } from '@/lib/pocketbase';
import { Button } from '@/components/ui/Button';
import {
  PageHeader,
  SkeletonTable,
  EmptyState,
  SearchInput,
  Pagination,
  ConfirmDialog,
} from '@/admin/components/ui';
import { useToast } from '@/hooks/useToast';

const PER_PAGE = 10;

export default function AdminReviews() {
  const { addToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (targetPage = page) => {
    setLoading(true);
    try {
      const r = await listAllReviews(targetPage, PER_PAGE, {
        search: search || undefined,
      });
      setReviews(r.items);
      setTotalItems(r.totalItems);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load reviews',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteReview(deleteTarget.id);
      setDeleteTarget(null);
      await load();
      addToast({ variant: 'success', title: 'Deleted', message: 'Review has been removed.' });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Could not delete review',
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
      <PageHeader title="Reviews" />

      <div className="mb-4">
        <SearchInput
          placeholder="Search by product, customer, or comment..."
          defaultValue={search}
          onChange={(e) => debouncedSearch(e.target.value)}
          wrapperClassName="w-full sm:w-80"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} columns={5} />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No reviews found"
          message={search ? 'Try a different search term.' : 'No reviews have been submitted yet.'}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-700">Product</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Customer</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Rating</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Comment</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {r.expand?.product?.name || r.product}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{r.expand?.user?.email || r.user}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-medium text-gray-900">{r.rating}</span>
                      </div>
                    </td>
                    <td className="max-w-xs px-6 py-4 text-gray-600">
                      <p className="truncate">{r.comment || '-'}</p>
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
        title="Delete review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="destructive"
        loading={deleting}
      />
    </div>
  );
}
