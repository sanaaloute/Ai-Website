import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  listAllProducts,
  listAllCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  type Product,
  type Category,
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
  FileInput,
  ConfirmDialog,
} from '@/admin/components/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/cn';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const PER_PAGE = 10;

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatPrice(value: string) {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
}

export default function AdminProducts() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Product['status'] | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>(getEmptyProduct());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  function getEmptyProduct(): Partial<Product> {
    return {
      name: '',
      slug: '',
      price: 0,
      stock: 0,
      description: '',
      status: 'draft',
      category: '',
    };
  }

  const load = async (targetPage = page) => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        listAllProducts(targetPage, PER_PAGE, {
          search: search || undefined,
          status: statusFilter,
        }),
        listAllCategories(),
      ]);
      setProducts(p.items);
      setTotalItems(p.totalItems);
      setCategories(c);
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Failed to load products',
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

  const openCreate = () => {
    setEditing(null);
    setForm(getEmptyProduct());
    setFormErrors({});
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({ ...product });
    setFormErrors({});
    setImageFile(null);
    setImagePreview(
      product.images && product.images.length > 0
        ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/products/${product.id}/${product.images[0]}`
        : null
    );
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = 'Name is required';
    if (!form.slug?.trim()) errors.slug = 'Slug is required';
    else if (!/^[a-z0-9-]+$/.test(form.slug)) errors.slug = 'Slug must be lowercase letters, numbers, and hyphens';
    if (form.price === undefined || form.price < 0) errors.price = 'Price must be 0 or greater';
    if (form.stock === undefined || form.stock < 0) errors.stock = 'Stock must be 0 or greater';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const data = {
        ...form,
        name: form.name!.trim(),
        slug: form.slug!.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        description: form.description?.trim(),
      };

      let saved: Product;
      if (editing) {
        saved = await updateProduct(editing.id, data);
      } else {
        saved = await createProduct(data);
      }

      if (imageFile) {
        await uploadProductImage(saved.id, imageFile);
      }

      setModalOpen(false);
      await load();
      addToast({
        variant: 'success',
        title: editing ? 'Product updated' : 'Product created',
        message: `"${saved.name}" has been saved.`,
      });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Could not save product',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      await load();
      addToast({ variant: 'success', title: 'Deleted', message: 'Product has been removed.' });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Could not delete product',
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
        title="Products"
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add product
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search products..."
          defaultValue={search}
          onChange={(e) => debouncedSearch(e.target.value)}
          wrapperClassName="w-full sm:w-80"
        />
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as Product['status'] | 'all');
          }}
          className="w-full sm:w-48"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} columns={6} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          message={search ? 'Try a different search term or filter.' : 'Get started by adding your first product.'}
          action={
            !search && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add product
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
                  <th className="px-6 py-3 font-medium text-gray-700">Product</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Category</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Price</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Stock</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                          {p.images && p.images.length > 0 ? (
                            <img
                              src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/products/${p.id}/${p.images[0]}`}
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
                    <td className="px-6 py-4 text-gray-900">${p.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className={cn(p.stock < 10 && 'font-medium text-red-600')}>{p.stock}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          p.status === 'active' ? 'success' : p.status === 'draft' ? 'warning' : 'default'
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit product' : 'Add product'}>
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Slug"
              required
              value={form.slug}
              error={formErrors.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
            <Select
              label="Category"
              options={[{ value: '', label: 'None' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price"
              type="number"
              step="0.01"
              min="0"
              required
              value={String(form.price ?? 0)}
              error={formErrors.price}
              onChange={(e) => setForm({ ...form, price: formatPrice(e.target.value) })}
            />
            <Input
              label="Stock"
              type="number"
              min="0"
              required
              value={String(form.stock ?? 0)}
              error={formErrors.stock}
              onChange={(e) => setForm({ ...form, stock: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            />
          </div>
          <Select
            label="Status"
            options={STATUS_OPTIONS.filter((o) => o.value !== 'all')}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as Product['status'] })}
          />
          <Textarea
            label="Description"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <FileInput
            label="Product image"
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
        title="Delete product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="destructive"
        loading={deleting}
      />
    </div>
  );
}
