"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-provider";
import { useAuth } from "@/components/auth-provider";
import { AdminSidebar } from "@/components/admin-sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  specs: string | null;
  version: string;
  isAvailable: boolean;
}

export default function AdminProductsPage() {
  const { translations: t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    version: "",
    specs: "",
    imageUrl: "/images/product-basic.png",
    isAvailable: true,
  });

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/products");
      const json = await res.json();
      setProducts(json.products || []);
    } catch {
      toast.error(t.adminProducts.failedToLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      stock: "",
      version: "",
      specs: "",
      imageUrl: "/images/product-basic.png",
      isAvailable: true,
    });
    setEditingProduct(null);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      version: product.version,
      specs: product.specs || "",
      imageUrl: product.imageUrl,
      isAvailable: product.isAvailable,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
    };

    const url = editingProduct
      ? `/api/admin/products/${editingProduct.id}`
      : "/api/admin/products";
    const method = editingProduct ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingProduct ? t.adminProducts.productUpdated : t.adminProducts.productCreated);
        setDialogOpen(false);
        resetForm();
        fetchProducts();
      } else {
        toast.error(t.adminProducts.failedToSave);
      }
    } catch {
      toast.error(t.adminProducts.failedToSave);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(t.adminProducts.productDeleted);
        setDeleteId(null);
        fetchProducts();
      } else {
        toast.error(t.adminProducts.failedToDelete);
      }
    } catch {
      toast.error(t.adminProducts.failedToDelete);
    }
  };

  const toggleAvailability = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock,
          imageUrl: product.imageUrl,
          specs: product.specs,
          version: product.version,
          isAvailable: !product.isAvailable,
        }),
      });
      if (res.ok) {
        toast.success(t.adminProducts.availabilityUpdated);
        fetchProducts();
      } else {
        toast.error(t.adminProducts.failedToUpdateAvailability);
      }
    } catch {
      toast.error(t.adminProducts.failedToUpdateAvailability);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="glass-card rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">
            {t.common.accessDenied}
          </h1>
          <p className="text-muted-foreground">
            {t.common.noPermission}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold neon-text">{t.adminProducts.title}</h2>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            {t.adminProducts.addProduct}
          </Button>
        </div>

        <div className="glass-card rounded-xl p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.adminProducts.name}</TableHead>
                    <TableHead>{t.adminProducts.version}</TableHead>
                    <TableHead>{t.adminProducts.price}</TableHead>
                    <TableHead>{t.adminProducts.stock}</TableHead>
                    <TableHead>{t.adminProducts.available}</TableHead>
                    <TableHead className="text-right">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>{product.version}</TableCell>
                      <TableCell>${product.price.toFixed(2)}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>
                        <Badge
                          variant={product.isAvailable ? "default" : "secondary"}
                        >
                          {product.isAvailable ? t.adminProducts.yes : t.adminProducts.no}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => toggleAvailability(product)}
                          >
                            {product.isAvailable ? (
                              <ToggleRight className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteId(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        {t.adminProducts.noProducts}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? t.adminProducts.editProduct : t.adminProducts.addProductDialog}
              </DialogTitle>
              <DialogDescription>
                {t.adminProducts.fillDetails}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t.adminProducts.name}</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t.common.description}</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.adminProducts.price}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.adminProducts.stock}</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.adminProducts.version}</Label>
                <Input
                  value={form.version}
                  onChange={(e) =>
                    setForm({ ...form, version: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t.common.imageUrl}</Label>
                <Input
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm({ ...form, imageUrl: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t.adminProducts.specsJson}</Label>
                <Textarea
                  value={form.specs}
                  onChange={(e) =>
                    setForm({ ...form, specs: e.target.value })
                  }
                  placeholder='{"key": "value"}'
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={form.isAvailable}
                  onChange={(e) =>
                    setForm({ ...form, isAvailable: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border bg-transparent text-primary focus:ring-primary"
                />
                <Label htmlFor="isAvailable" className="cursor-pointer">
                  {t.adminProducts.availableCheckbox}
                </Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  {t.common.cancel}
                </Button>
                <Button type="submit">
                  {editingProduct ? t.adminProducts.saveChanges : t.adminProducts.createProduct}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.adminProducts.deleteProduct}</DialogTitle>
              <DialogDescription>
                {t.adminProducts.deleteConfirm} {t.adminProducts.deleteWarning}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteId && handleDelete(deleteId)}
              >
                {t.adminProducts.deleteBtn}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
