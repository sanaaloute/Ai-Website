"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, Download, Ban, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/dashboard/data-table";
import { UserDetailModal } from "@/components/dashboard/user-detail-modal";
import {
  fetchUsers,
  fetchUserDetail,
  updateUserStatus,
  deleteUser,
} from "@/lib/api/client";
import { User, UserDetail } from "@/lib/types";
import { useToastStore } from "@/store/ui-store";
import { useTranslation, useFormatters, useMockLabels } from "@/lib/i18n";

export default function UsersPage() {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const labels = useMockLabels();
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detailUser, setDetailUser] = useState<UserDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, pageSize, search, statusFilter],
    queryFn: () => fetchUsers(page + 1, pageSize, search, statusFilter),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      addToast({ title: t("users.toast.statusUpdated"), variant: "success" });
    },
    onError: () => {
      addToast({ title: t("users.toast.statusUpdateFailed"), variant: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      addToast({ title: t("users.toast.deleted"), variant: "success" });
    },
    onError: () => {
      addToast({ title: t("users.toast.deleteFailed"), variant: "error" });
    },
  });

  const handleView = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const user = await fetchUserDetail(id);
      setDetailUser(user);
    } catch {
      addToast({ title: t("users.toast.loadFailed"), variant: "error" });
    } finally {
      setDetailLoading(false);
    }
  }, [addToast, t]);

  const handleExport = useCallback(() => {
    const rows = data?.data ?? [];
    const csv = [
      t("users.csvHeaders.0") + ", " + t("users.csvHeaders.1") + ", " + t("users.csvHeaders.2") + ", " + t("users.csvHeaders.3") + ", " + t("users.csvHeaders.4") + ", " + t("users.csvHeaders.5"),
      ...rows.map((u) =>
        [u.name, u.email, u.plan, u.status, u.joinDate, u.lastActive].join(", ")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ title: t("users.toast.exported"), variant: "success" });
  }, [data, addToast, t]);

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: t("users.columns.name"),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan/20 to-purple/20 text-xs font-bold text-white">
              {row.original.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <span className="font-medium text-foreground">{row.original.name}</span>
          </div>
        ),
      },
      { accessorKey: "email", header: t("users.columns.email") },
      {
        accessorKey: "plan",
        header: t("users.columns.plan"),
        cell: ({ row }) => (
          <Badge variant="default">{labels.plan(row.original.plan)}</Badge>
        ),
      },
      {
        accessorKey: "status",
        header: t("users.columns.status"),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "Active"
                ? "success"
                : row.original.status === "Suspended"
                ? "destructive"
                : "warning"
            }
          >
            {labels.userStatus(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: "joinDate",
        header: t("users.columns.joinDate"),
        cell: ({ row }) => formatDate(row.original.joinDate),
      },
      {
        accessorKey: "lastActive",
        header: t("users.columns.lastActive"),
        cell: ({ row }) => formatDate(row.original.lastActive),
      },
      {
        id: "actions",
        header: t("users.columns.actions"),
        cell: ({ row }) => (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {row.original.status !== "Suspended" ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("users.aria.suspend")}
                onClick={() =>
                  statusMutation.mutate({
                    id: row.original.id,
                    status: "Suspended",
                  })
                }
              >
                <Ban className="h-4 w-4 text-amber-400" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("users.aria.activate")}
                onClick={() =>
                  statusMutation.mutate({
                    id: row.original.id,
                    status: "Active",
                  })
                }
              >
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("users.aria.delete")}
              onClick={() => {
                if (confirm(t("users.confirmDelete"))) {
                  deleteMutation.mutate(row.original.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        ),
      },
    ],
    [handleView, statusMutation, deleteMutation, t, labels, formatDate]
  );

  const pageCount = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {t("users.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("users.subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          {t("users.exportCSV")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("users.searchPlaceholder")}
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Select
          value={statusFilter || "ALL"}
          onValueChange={(v) => {
            setStatusFilter(v === "ALL" ? "" : v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("users.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("users.allStatuses")}</SelectItem>
            <SelectItem value="Active">{t("users.status.active")}</SelectItem>
            <SelectItem value="Inactive">{t("users.status.inactive")}</SelectItem>
            <SelectItem value="Suspended">{t("users.status.suspended")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        pageCount={pageCount}
        pageIndex={page}
        pageSize={pageSize}
        onPageChange={setPage}
        totalRows={data?.total}
        onRowClick={(row) => handleView(row.id)}
      />

      <UserDetailModal
        user={detailUser}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        loading={detailLoading}
      />
    </div>
  );
}
