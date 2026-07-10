import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  listAllCourses,
  createCourses,
  updateCourses,
  deleteCourses,
  type Courses,
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
  SkeletonTable,
  EmptyState,
  SearchInput,
  Pagination,
  ConfirmDialog,
  TableContainer,
} from '@/admin/components/ui';
import { useToast } from '@/hooks/useToast';

const STATUS_OPTIONS = [
  { value: 'active', label: 'active' },
  { value: 'draft', label: 'draft' },
  { value: 'archived', label: 'archived' }
];

const PER_PAGE = 10;

const emptyCourses: Partial<Courses> = {
  name: '',
  slug: '',
  instructor: '',
  duration: '',
  price: 0,
  description: '',
  image: '',
  status: 'active',
  category: '',
};

export default function AdminCourses() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Courses[]>([]);
  const [categories, setCategories] = useState<Categories[]>([]);
  const categoryOptions = [{ value: '', label: 'None' }, ...categories.map((c) => ({ value: c.id, label: c.name }))];
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Courses | null>(null);
  const [form, setForm] = useState<Partial<Courses>>(emptyCourses);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        listAllCourses(page, PER_PAGE, { search: search.trim() || undefined }),
        listAllCategories(),
      ]);
      setItems(p.items);
      setTotalItems(p.totalItems);
      setCategories(c);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load courses.';
      addToast({ variant: 'error', title: 'Failed to load courses', message });
    } finally {
      setLoading(false);
    }
  }, [page, search, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCourses);
    setModalOpen(true);
  };

  const openEdit = (item: Courses) => {
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
        await updateCourses(editing.id, data);
        addToast({ variant: 'success', title: 'Saved', message: 'Course updated successfully.' });
      } else {
        await createCourses(data);
        addToast({ variant: 'success', title: 'Created', message: 'Course created successfully.' });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save course.';
      addToast({ variant: 'error', title: 'Save failed', message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteCourses(deleteId);
      addToast({ variant: 'success', title: 'Deleted', message: 'Course deleted successfully.' });
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete course.';
      addToast({ variant: 'error', title: 'Delete failed', message });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Courses"
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add course
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search courses..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          wrapperClassName="sm:w-72"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} columns={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No courses"
          message={search ? 'No courses match your search.' : 'Get started by adding your first course.'}
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add course
            </Button>
          }
        />
      ) : (
        <TableContainer>
          <table className="w-full text-left text-sm">
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
                      onClick={() => setDeleteId(p.id)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit course' : 'Add course'}>
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
            label="Instructor"
            value={form.instructor as string}
            onChange={(e) => setForm({ ...form, instructor: e.target.value })}
          />
          <Input
            label="Duration"
            value={form.duration as string}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
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
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete course"
        message="Are you sure you want to delete this course? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
