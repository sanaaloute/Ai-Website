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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Download, Eye, XCircle } from "lucide-react";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface Order {
  id: string;
  guestName: string | null;
  guestEmail: string | null;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "Pending":
      return "outline";
    case "Paid":
      return "default";
    case "Shipped":
      return "secondary";
    case "Delivered":
      return "default";
    case "Cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case "Delivered":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Pending":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "";
  }
}

export default function AdminOrdersPage() {
  const { translations: t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [viewItemsOrder, setViewItemsOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all")
      params.append("status", statusFilter);
    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);

    try {
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = await res.json();
      setOrders(json.orders || []);
    } catch {
      toast.error(t.adminOrders.failedToLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, fromDate, toDate]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(t.adminOrders.statusUpdated);
        fetchOrders();
      } else {
        toast.error(t.adminOrders.failedToUpdateStatus);
      }
    } catch {
      toast.error(t.adminOrders.failedToUpdateStatus);
    }
  };

  const cancelOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(t.adminOrders.orderCancelled);
        setCancelId(null);
        fetchOrders();
      } else {
        toast.error(t.adminOrders.failedToCancel);
      }
    } catch {
      toast.error(t.adminOrders.failedToCancel);
    }
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all")
      params.append("status", statusFilter);
    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);
    window.open(`/api/admin/orders/export?${params.toString()}`, "_blank");
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold neon-text">{t.adminOrders.title}</h2>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            {t.adminOrders.exportCsv}
          </Button>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Label className="mb-2 block text-xs text-muted-foreground">
              {t.adminOrders.statusFilter}
            </Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "all")}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t.adminOrders.allStatuses} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                <SelectItem value="Pending">{t.common.pending}</SelectItem>
                <SelectItem value="Paid">{t.common.paid}</SelectItem>
                <SelectItem value="Shipped">{t.common.shipped}</SelectItem>
                <SelectItem value="Delivered">{t.common.delivered}</SelectItem>
                <SelectItem value="Cancelled">{t.common.cancelled}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="mb-2 block text-xs text-muted-foreground">
              {t.adminOrders.from}
            </Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label className="mb-2 block text-xs text-muted-foreground">
              {t.adminOrders.to}
            </Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
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
                    <TableHead>{t.adminOrders.id}</TableHead>
                    <TableHead>{t.adminOrders.customer}</TableHead>
                    <TableHead>{t.common.email}</TableHead>
                    <TableHead>{t.adminOrders.total}</TableHead>
                    <TableHead>{t.adminOrders.status}</TableHead>
                    <TableHead>{t.adminOrders.payment}</TableHead>
                    <TableHead>{t.adminOrders.date}</TableHead>
                    <TableHead className="text-right">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{order.guestName || t.adminOrders.na}</TableCell>
                      <TableCell className="text-xs">
                        {order.guestEmail || t.adminOrders.na}
                      </TableCell>
                      <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusVariant(order.status)}
                          className={getStatusClass(order.status)}
                        >
                          {order.status === "Pending" ? t.common.pending : order.status === "Paid" ? t.common.paid : order.status === "Shipped" ? t.common.shipped : order.status === "Delivered" ? t.common.delivered : order.status === "Cancelled" ? t.common.cancelled : order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {order.paymentMethod}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={order.status}
                            onValueChange={(v) => v && updateStatus(order.id, v)}
                          >
                            <SelectTrigger className="w-28 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">{t.common.pending}</SelectItem>
                              <SelectItem value="Paid">{t.common.paid}</SelectItem>
                              <SelectItem value="Shipped">{t.common.shipped}</SelectItem>
                              <SelectItem value="Delivered">
                                Delivered
                              </SelectItem>
                              <SelectItem value="Cancelled">
                                Cancelled
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setViewItemsOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status !== "Cancelled" && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setCancelId(order.id)}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-8"
                      >
                        {t.adminOrders.noOrders}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* View Items Dialog */}
        <Dialog
          open={!!viewItemsOrder}
          onOpenChange={(open) => !open && setViewItemsOrder(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t.adminOrders.orderItems}</DialogTitle>
              <DialogDescription>
                {t.adminOrders.itemsInOrder} {viewItemsOrder?.id.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              {viewItemsOrder?.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-12 w-12 rounded-lg object-cover border border-slate-700/30 shadow-sm"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${item.price.toFixed(2)} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-sm">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
              {viewItemsOrder?.items.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  {t.adminOrders.noItems}
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation */}
        <Dialog
          open={!!cancelId}
          onOpenChange={(open) => !open && setCancelId(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.adminOrders.cancelOrder}</DialogTitle>
              <DialogDescription>
                {t.adminOrders.cancelConfirm}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setCancelId(null)}>
                {t.adminOrders.keepOrder}
              </Button>
              <Button
                variant="destructive"
                onClick={() => cancelId && cancelOrder(cancelId)}
              >
                {t.adminOrders.confirmCancel}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
