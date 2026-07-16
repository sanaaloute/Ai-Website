import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  listAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
  type Category,
} from '@/lib/pocketbase';
import { Button } from '@/components/ui/Button';
import {
  Input,
  Modal,
  PageHeader,
  SkeletonTable,
  EmptyState,
  SearchInput,
  FileInput,
  ConfirmDialog,
} from '@/admin/components/ui';
import { useToast } from '@/hooks/useToast';

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCategories() {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<Partial<Category>>({ name: '', slug: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const c = await listAllCategories(search || undefined);
      setCategories(c);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load categories',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '' });
    setFormErrors({});
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({ ...category });
    setFormErrors({});
    setImageFile(null);
    setImagePreview(
      category.image
        ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/categories/${category.id}/${category.image}`
        : null
    );
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = 'Name is required';
    if (!form.slug?.trim()) errors.slug = 'Slug is required';
    else if (!/^[a-z0-9-]+$/.test(form.slug)) errors.slug = 'Slug must be lowercase letters, numbers, and hyphens';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const data = {
        name: form.name!.trim(),
        slug: form.slug!.trim(),
      };

      let saved: Category;
      if (editing) {
        saved = await updateCategory(editing.id, data);
      } else {
        saved = await createCategory(data);
      }

      if (imageFile) {
        await uploadCategoryImage(saved.id, imageFile);
      }

      setModalOpen(false);
      await load();
      addToast({
        variant: 'success',
        title: editing ? 'Category updated' : 'Category created',
        message: `"${saved.name}" has been saved.`,
      });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Could not save category',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      await load();
      addToast({ variant: 'success', title: 'Deleted', message: 'Category has been removed.' });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Could not delete category',
      });
    } finally {
      setDeleting(false);
    }
  };

  const debouncedSearch = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setSearch(value), 300);
    };
  }, []);

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
        <SkeletonTable rows={5} columns={4} />
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories found"
          message={search ? 'Try a different search term.' : 'Get started by adding your first category.'}
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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-700">Category</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Slug</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                          {c.image ? (
                            <img
                              src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/categories/${c.id}/${c.image}`}
                              alt={c.name}
                              className="h-full w-full rounded-lg object-cover"
                            />
                          ) : (
                            <Search className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{c.slug}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEdit(c)}
                        className="mr-2 inline-flex rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
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
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit category' : 'Add category'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Name"
            required
            value={form.name}
            error={formErrors.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm((prev) => ({
                ...prev,
                name,
                slug: editing ? prev.slug : slugify(name),
              }));
            }}
          />
          <Input
            label="Slug"
            required
            value={form.slug}
            error={formErrors.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <FileInput
            label="Category image"
            onChange={(file) => {
              setImageFile(file);
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => setImagePreview(reader.result as string);
                reader.readAsDataURL(file);
              } else {
                setImagePreview(null);
              }
            }}
            previewUrl={imagePreview}
            clearPreview={() => {
              setImageFile(null);
              setImagePreview(null);
            }}
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
        title="Delete category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Products in this category will lose their category.`}
        confirmText="Delete"
        confirmVariant="destructive"
        loading={deleting}
      />
    </div>
  );
}
