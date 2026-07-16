import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  listAllPosts,
  createPosts,
  updatePosts,
  deletePosts,
  type Posts,
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
  { value: 'published', label: 'published' },
  { value: 'draft', label: 'draft' },
  { value: 'archived', label: 'archived' }
];

const PER_PAGE = 10;

const emptyPosts: Partial<Posts> = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  image: '',
  status: 'published',
  category: '',
};

export default function AdminPosts() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Posts[]>([]);
  const [categories, setCategories] = useState<Categories[]>([]);
  const categoryOptions = [{ value: '', label: 'None' }, ...categories.map((c) => ({ value: c.id, label: c.name }))];
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Posts | null>(null);
  const [form, setForm] = useState<Partial<Posts>>(emptyPosts);
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
        listAllPosts(page, PER_PAGE, { search: search.trim() || undefined }),
        listAllCategories(),
      ]);
      setItems(p.items);
      setTotalItems(p.totalItems);
      setCategories(c);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load posts.';
      addToast({ variant: 'error', title: 'Failed to load posts', message });
    } finally {
      setLoading(false);
    }
  }, [page, search, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPosts);
    setModalOpen(true);
  };

  const openEdit = (item: Posts) => {
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
        await updatePosts(editing.id, data);
        addToast({ variant: 'success', title: 'Saved', message: 'Post updated successfully.' });
      } else {
        await createPosts(data);
        addToast({ variant: 'success', title: 'Created', message: 'Post created successfully.' });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save post.';
      addToast({ variant: 'error', title: 'Save failed', message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deletePosts(deleteId);
      addToast({ variant: 'success', title: 'Deleted', message: 'Post deleted successfully.' });
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete post.';
      addToast({ variant: 'error', title: 'Delete failed', message });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Posts"
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add post
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search posts..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          wrapperClassName="sm:w-72"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} columns={4} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No posts"
          message={search ? 'No posts match your search.' : 'Get started by adding your first post.'}
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add post
            </Button>
          }
        />
      ) : (
        <TableContainer>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-700">Title</th>
                <th className="px-6 py-3 font-medium text-gray-700">Category</th>
                <th className="px-6 py-3 font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{p.title}</td>
                  <td className="px-6 py-4 text-gray-600">{p.expand?.category?.name || '-'}</td>
                  <td className="px-6 py-4"><Badge>{p.status}</Badge></td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit post' : 'Add post'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Title"
            required
            value={form.title as string}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Slug"
            required
            value={form.slug as string}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <Textarea
            label="Excerpt"
            rows={4}
            value={form.excerpt as string}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          />
          <Textarea
            label="Content"
            rows={4}
            value={form.content as string}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
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
        title="Delete post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
