import { useEffect, useMemo, useState } from 'react';
import { listAllOrders, updateOrderStatus, type Order } from '@/lib/pocketbase';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  PageHeader,
  AdminCard,
  SkeletonTable,
  EmptyState,
  SearchInput,
  Pagination,
} from '@/admin/components/ui';
import { useToast } from '@/hooks/useToast';

const STATUS_OPTIONS: { value: Order['status'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PER_PAGE = 10;

export default function AdminOrders() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async (targetPage = page) => {
    setLoading(true);
    try {
      const o = await listAllOrders(targetPage, PER_PAGE, {
        status: statusFilter,
        search: search || undefined,
      });
      setOrders(o.items);
      setTotalItems(o.totalItems);
      if (selected && !o.items.find((item) => item.id === selected.id)) {
        setSelected(null);
      }
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load orders',
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

  const handleStatusChange = async (id: string, status: Order['status']) => {
    setUpdating(id);
    try {
      await updateOrderStatus(id, status);
      await load();
      addToast({ variant: 'success', title: 'Order updated', message: `Status changed to ${status}.` });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Update failed',
        message: err instanceof Error ? err.message : 'Could not update order',
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
      <PageHeader title="Orders" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search by customer email or order ID..."
          defaultValue={search}
          onChange={(e) => debouncedSearch(e.target.value)}
          wrapperClassName="w-full sm:w-80"
        />
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as Order['status'] | 'all');
          }}
          className="w-full sm:w-48"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} columns={4} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          message={search || statusFilter !== 'all' ? 'Try changing your filters.' : 'No orders have been placed yet.'}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 font-medium text-gray-700">Order</th>
                      <th className="px-6 py-3 font-medium text-gray-700">Customer</th>
                      <th className="px-6 py-3 font-medium text-gray-700">Status</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((o) => (
                      <tr
                        key={o.id}
                        onClick={() => setSelected(o)}
                        className={`cursor-pointer hover:bg-gray-50 ${selected?.id === o.id ? 'bg-gray-50' : ''}`}
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">#{o.id.slice(-6)}</td>
                        <td className="px-6 py-4 text-gray-600">{o.expand?.user?.email || o.user}</td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              o.status === 'paid' || o.status === 'shipped'
                                ? 'success'
                                : o.status === 'cancelled'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {o.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">${o.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} perPage={PER_PAGE} totalItems={totalItems} onPageChange={setPage} />
            </div>
          </div>

          <div>
            {selected ? (
              <AdminCard>
                <h2 className="text-lg font-semibold text-gray-900">Order #{selected.id.slice(-6)}</h2>
                <p className="text-sm text-gray-600">{selected.expand?.user?.email || selected.user}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {new Date(selected.created).toLocaleString()}
                </p>

                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Select
                    options={STATUS_OPTIONS.filter((o) => o.value !== 'all')}
                    value={selected.status}
                    disabled={updating === selected.id}
                    onChange={(e) => handleStatusChange(selected.id, e.target.value as Order['status'])}
                    className="mt-1"
                  />
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700">Items</h3>
                  <ul className="mt-2 space-y-2">
                    {selected.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-900">
                          {item.name} × {item.qty}
                        </span>
                        <span className="font-medium text-gray-900">${(item.price * item.qty).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-base font-semibold text-gray-900">
                    <span>Total</span>
                    <span>${selected.total.toFixed(2)}</span>
                  </div>
                </div>
              </AdminCard>
            ) : (
              <AdminCard>
                <p className="text-sm text-gray-600">Select an order to view details.</p>
              </AdminCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
