"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-provider";
import { useAuth } from "@/components/auth-provider";
import { AdminSidebar } from "@/components/admin-sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  transactionId: string | null;
  status: string;
  createdAt: string;
}

function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "success":
      return "default";
    case "failed":
      return "destructive";
    case "pending":
      return "outline";
    default:
      return "outline";
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case "success":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "pending":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "";
  }
}

export default function AdminPaymentsPage() {
  const { translations: t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState("");

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payments");
      const json = await res.json();
      const all = json.payments || [];
      setAllPayments(all);
      setPayments(
        methodFilter ? all.filter((p: Payment) => p.method === methodFilter) : all
      );
    } catch {
      setAllPayments([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPayments(
      methodFilter
        ? allPayments.filter((p) => p.method === methodFilter)
        : allPayments
    );
  }, [methodFilter, allPayments]);

  const methods = Array.from(new Set(allPayments.map((p) => p.method)));

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
          <h2 className="text-2xl font-bold neon-text">{t.adminPayments.title}</h2>
          {methods.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setMethodFilter("")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium border transition-colors",
                  methodFilter === ""
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                {t.adminPayments.all}
              </button>
              {methods.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium border transition-colors",
                    methodFilter === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
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
                    <TableHead>{t.adminPayments.transactionId}</TableHead>
                    <TableHead>{t.adminPayments.orderId}</TableHead>
                    <TableHead>{t.adminPayments.amount}</TableHead>
                    <TableHead>{t.adminPayments.method}</TableHead>
                    <TableHead>{t.adminPayments.status}</TableHead>
                    <TableHead>{t.adminPayments.timestamp}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        {payment.transactionId || t.adminPayments.na}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {payment.orderId.slice(0, 8)}...
                      </TableCell>
                      <TableCell>${payment.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-xs">
                        {payment.method}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusVariant(payment.status)}
                          className={getStatusClass(payment.status)}
                        >
                          {payment.status === "success" ? t.common.success : payment.status === "failed" ? t.common.failed : payment.status === "pending" ? t.common.pending : payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(payment.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        {t.adminPayments.noPayments}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
