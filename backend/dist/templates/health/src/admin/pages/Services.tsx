import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  listAllServices,
  createServices,
  updateServices,
  deleteServices,
  type Services,
  type Categories,
  listAllCategories,
} from '@/lib/pocketbase';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Input,
  Textarea,
  Select,
  Modal,
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
  { value: 'active', label: 'active' },
  { value: 'draft', label: 'draft' },
  { value: 'archived', label: 'archived' }
];

const PER_PAGE = 10;

const emptyServices: Partial<Services> = {
  name: '',
  slug: '',
  provider: '',
  price: 0,
  description: '',
  image: '',
  status: 'active',
  category: '',
};

export default function AdminServices() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Services[]>([]);
  const [categories, setCategories] = useState<Categories[]>([]);
  const categoryOptions = [{ value: '', label: 'None' }, ...categories.map((c) => ({ value: c.id, label: c.name }))];
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Services | null>(null);
  const [form, setForm] = useState<Partial<Services>>(emptyServices);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (currentPage = page, currentSearch = search) => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        listAllServices(currentPage, PER_PAGE, { search: currentSearch || undefined }),
        listAllCategories(),
      ]);
      setItems(p.items);
      setTotalItems(p.totalItems);
      setCategories(c);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load services',
        message: err instanceof Error ? err.message : 'Could not load services.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyServices);
    setModalOpen(true);
  };

  const openEdit = (item: Services) => {
    setEditing(item);
    setForm({ ...item });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form };
      if (editing) {
        await updateServices(editing.id, data);
        addToast({ variant: 'success', title: 'Updated', message: 'Service updated successfully.' });
      } else {
        await createServices(data);
        addToast({ variant: 'success', title: 'Created', message: 'Service created successfully.' });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Failed to save service.',
      });
    } finally {
      setSaving(false);
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
      await deleteServices(deletingId);
      addToast({ variant: 'success', title: 'Deleted', message: 'Service deleted successfully.' });
      await load();
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Failed to delete service.',
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Services"
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add service
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search services..."
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
          title="No services"
          message={search ? 'No services match your search.' : 'Get started by adding your first service.'}
          action={
            !search && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add service
              </Button>
            )
          }
        />
      ) : (
        <TableContainer>
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-700">Name</th>
                <th className="px-6 py-3 font-medium text-gray-700">Category</th>
                <th className="px-6 py-3 font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 font-medium text-gray-700">Price</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-gray-600">{p.expand?.category?.name || '-'}</td>
                  <td className="px-6 py-4"><Badge>{p.status}</Badge></td>
                  <td className="px-6 py-4 text-gray-900">{p.price}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEdit(p)}
                      className="mr-2 inline-flex rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openDelete(p.id)}
                      className="inline-flex rounded-md p-1.5 text-red-600 hover:bg-red-50"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} perPage={PER_PAGE} totalItems={totalItems} onPageChange={setPage} />
        </TableContainer>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit service' : 'Add service'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Name"
            required
            value={form.name as string}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Slug"
            required
            value={form.slug as string}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <Input
            label="Provider"
            value={form.provider as string}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
          />
          <Input
            label="Price"
            type="number"
            step="0.01"
            min="0"
            value={String(form.price ?? 0)}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          />
          <Textarea
            label="Description"
            rows={4}
            value={form.description as string}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Image"
            value={form.image as string}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status as string}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={form.category as string}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete service"
        message="Are you sure you want to delete this service? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="destructive"
        loading={deleting}
      />
    </div>
  );
}
