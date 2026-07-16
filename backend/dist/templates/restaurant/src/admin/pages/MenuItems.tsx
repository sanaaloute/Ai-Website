import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  listAllMenuItems,
  listAllCategories,
  createMenuItems,
  updateMenuItems,
  deleteMenuItems,
  type MenuItems,
  type Categories,
} from '@/lib/pocketbase';
import { Button } from '@/components/ui/Button';
import {
  Input,
  Textarea,
  Select,
  Modal,
  PageHeader,
  SkeletonTable,
  EmptyState,
  Pagination,
  SearchInput,
  ConfirmDialog,
} from '@/admin/components/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const PER_PAGE = 10;

const emptyMenuItems: Partial<MenuItems> = {
  name: '',
  slug: '',
  price: 0,
  description: '',
  image: '',
  status: 'active',
  category: '',
};

export default function AdminMenuItems() {
  const { addToast } = useToast();
  const [items, setItems] = useState<MenuItems[]>([]);
  const [categories, setCategories] = useState<Categories[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItems | null>(null);
  const [form, setForm] = useState<Partial<MenuItems>>(emptyMenuItems);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuItems | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categoryOptions = useMemo(
    () => [{ value: '', label: 'None' }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    [categories]
  );

  const load = async (targetPage = page) => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        listAllMenuItems(targetPage, PER_PAGE, { search: search || undefined }),
        listAllCategories(),
      ]);
      setItems(p.items);
      setTotalItems(p.totalItems);
      setCategories(c);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load menu items',
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

  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return items;
    return items.filter((p) => p.status === statusFilter);
  }, [items, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyMenuItems);
    setModalOpen(true);
  };

  const openEdit = (item: MenuItems) => {
    setEditing(item);
    setForm({ ...item });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.slug?.trim()) {
      addToast({ variant: 'warning', title: 'Validation', message: 'Name and slug are required.' });
      return;
    }

    setSaving(true);
    try {
      const data = { ...form };
      if (editing) {
        await updateMenuItems(editing.id, data);
      } else {
        await createMenuItems(data);
      }
      setModalOpen(false);
      await load();
      addToast({
        variant: 'success',
        title: editing ? 'Menu item updated' : 'Menu item created',
        message: `"${form.name}" has been saved.`,
      });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Could not save menu item',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMenuItems(deleteTarget.id);
      setDeleteTarget(null);
      await load();
      addToast({ variant: 'success', title: 'Deleted', message: 'Menu item has been removed.' });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Could not delete menu item',
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
      <PageHeader
        title="Menu Items"
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add menu item
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search menu items..."
          defaultValue={search}
          onChange={(e) => debouncedSearch(e.target.value)}
          wrapperClassName="w-full sm:w-80"
        />
        <Select
          options={[{ value: 'all', label: 'All statuses' }, ...STATUS_OPTIONS]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} columns={5} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No menu items found"
          message={search ? 'Try a different search term or filter.' : 'Get started by adding your first menu item.'}
          action={
            !search && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add menu item
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
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
                {filteredItems.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                          {p.image ? (
                            <img
                              src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/menu_items/${p.id}/${p.image}`}
                              alt={p.name}
                              className="h-full w-full rounded-lg object-cover"
                            />
                          ) : (
                            <Search className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{p.expand?.category?.name || '-'}</td>
                    <td className="px-6 py-4"><Badge>{p.status}</Badge></td>
                    <td className="px-6 py-4 text-gray-900">{p.price}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="mr-2 inline-flex rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="inline-flex rounded-md p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} perPage={PER_PAGE} totalItems={totalItems} onPageChange={setPage} />
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit menu item' : 'Add menu item'}>
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
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete menu item"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="destructive"
        loading={deleting}
      />
    </div>
  );
}
