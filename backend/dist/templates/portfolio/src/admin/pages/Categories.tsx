import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  listAllCategories,
  createCategories,
  updateCategories,
  deleteCategories,
  type Categories,
} from '@/lib/pocketbase';
import { Button } from '@/components/ui/Button';
import {
  Input,
  Modal,
  PageHeader,
  SkeletonTable,
  EmptyState,
  SearchInput,
  ConfirmDialog,
  TableContainer,
} from '@/admin/components/ui';
import { useToast } from '@/hooks/useToast';

const emptyCategories: Partial<Categories> = {
  name: '',
  slug: '',
};

export default function AdminCategories() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Categories[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Categories | null>(null);
  const [form, setForm] = useState<Partial<Categories>>(emptyCategories);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setSearch(value), 300);
    };
  }, []);

  const load = async (currentSearch = search) => {
    setLoading(true);
    try {
      const c = await listAllCategories(currentSearch || undefined);
      setItems(c);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load categories',
        message: err instanceof Error ? err.message : 'Could not fetch categories.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCategories);
    setModalOpen(true);
  };

  const openEdit = (item: Categories) => {
    setEditing(item);
    setForm({ ...item });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateCategories(editing.id, form);
        addToast({ variant: 'success', title: 'Updated', message: 'Category has been updated.' });
      } else {
        await createCategories(form);
        addToast({ variant: 'success', title: 'Created', message: 'Category has been created.' });
      }
      setModalOpen(false);
      await load(search);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Could not save category.',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string) => setDeleteId(id);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteCategories(deleteId);
      addToast({ variant: 'success', title: 'Deleted', message: 'Category has been deleted.' });
      await load(search);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Could not delete category.',
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add category
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput
          placeholder="Search categories..."
          defaultValue={search}
          onChange={(e) => debouncedSearch(e.target.value)}
          wrapperClassName="w-full sm:w-80"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={3} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No categories"
          message={search ? 'No categories match your search.' : 'There are no categories yet.'}
          action={
            !search && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add category
              </Button>
            )
          }
        />
      ) : (
        <TableContainer>
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-700">Name</th>
                <th className="px-6 py-3 font-medium text-gray-700">Slug</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                  <td className="px-6 py-4 text-gray-600">{c.slug}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEdit(c)}
                      className="mr-2 inline-flex rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => confirmDelete(c.id)}
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
        </TableContainer>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit category' : 'Add category'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Slug"
            required
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
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
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
