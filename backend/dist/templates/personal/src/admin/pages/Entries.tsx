import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  listAllEntries,
  createEntries,
  updateEntries,
  deleteEntries,
  type Entries,
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
  { value: 'archived', label: 'archived' },
];

const emptyEntries: Partial<Entries> = {
  title: '',
  slug: '',
  summary: '',
  content: '',
  image: '',
  status: 'published',
  category: '',
};

const PER_PAGE = 10;

export default function AdminEntries() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Entries[]>([]);
  const [categories, setCategories] = useState<Categories[]>([]);
  const categoryOptions = [
    { value: '', label: 'None' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Entries | null>(null);
  const [form, setForm] = useState<Partial<Entries>>(emptyEntries);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (currentPage = page, currentSearch = search) => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        listAllEntries(currentPage, PER_PAGE, { search: currentSearch || undefined }),
        listAllCategories(),
      ]);
      setItems(p.items);
      setTotalItems(p.totalItems);
      setCategories(c);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load entries',
        message: err instanceof Error ? err.message : 'Could not fetch entries.',
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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyEntries);
    setModalOpen(true);
  };

  const openEdit = (item: Entries) => {
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
        await updateEntries(editing.id, data);
        addToast({ variant: 'success', title: 'Updated', message: 'Entry has been updated.' });
      } else {
        await createEntries(data);
        addToast({ variant: 'success', title: 'Created', message: 'Entry has been created.' });
      }
      setModalOpen(false);
      await load(page, search);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Could not save entry.',
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
      await deleteEntries(deleteId);
      addToast({ variant: 'success', title: 'Deleted', message: 'Entry has been deleted.' });
      await load(page, search);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Could not delete entry.',
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Entries"
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add entry
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search entries..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          wrapperClassName="sm:w-72"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={4} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No entries"
          message={search ? 'No entries match your search.' : 'There are no entries yet.'}
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add entry
            </Button>
          }
        />
      ) : (
        <TableContainer>
          <table className="w-full min-w-[40rem] text-left text-sm">
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
                  <td className="px-6 py-4">
                    <Badge>{p.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEdit(p)}
                      className="mr-2 inline-flex rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => confirmDelete(p.id)}
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
          <Pagination
            page={page}
            perPage={PER_PAGE}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        </TableContainer>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit entry' : 'Add entry'}>
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
            label="Summary"
            rows={4}
            value={form.summary as string}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
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
        title="Delete entry"
        message="Are you sure you want to delete this entry? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
