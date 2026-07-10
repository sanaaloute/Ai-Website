import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  listAllPlans,
  createPlans,
  updatePlans,
  deletePlans,
  type Plans,
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
} from '@/admin/components/ui';
import { useToast } from '@/hooks/useToast';

const emptyPlans: Partial<Plans> = {
  name: '',
  slug: '',
};

export default function AdminPlans() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Plans[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plans | null>(null);
  const [form, setForm] = useState<Partial<Plans>>(emptyPlans);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plans | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const c = await listAllPlans(search || undefined);
      setItems(c);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load plans',
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
    setForm(emptyPlans);
    setModalOpen(true);
  };

  const openEdit = (item: Plans) => {
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
      const data = { name: form.name.trim(), slug: form.slug.trim() };
      if (editing) {
        await updatePlans(editing.id, data);
      } else {
        await createPlans(data);
      }
      setModalOpen(false);
      await load();
      addToast({
        variant: 'success',
        title: editing ? 'Plan updated' : 'Plan created',
        message: `"${data.name}" has been saved.`,
      });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Could not save plan',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePlans(deleteTarget.id);
      setDeleteTarget(null);
      await load();
      addToast({ variant: 'success', title: 'Deleted', message: 'Plan has been removed.' });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Could not delete plan',
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
        title="Plans"
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add plan
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput
          placeholder="Search plans..."
          defaultValue={search}
          onChange={(e) => debouncedSearch(e.target.value)}
          wrapperClassName="w-full sm:w-80"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={3} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No plans found"
          message={search ? 'Try a different search term.' : 'Get started by adding your first plan.'}
          action={
            !search && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add plan
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
                  <th className="px-6 py-3 font-medium text-gray-700">Name</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Slug</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit plan' : 'Add plan'}>
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
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete plan"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="destructive"
        loading={deleting}
      />
    </div>
  );
}
