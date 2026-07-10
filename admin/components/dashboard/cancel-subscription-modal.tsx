"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";

interface CancelSubscriptionModalProps {
  subscriptionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string, reason: string) => void;
  loading?: boolean;
}

export function CancelSubscriptionModal({
  subscriptionId,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: CancelSubscriptionModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setReason("");
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cancelSubscription.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            {t("cancelSubscription.body")}
          </p>
          <div className="space-y-2">
            <Label htmlFor="reason">{t("cancelSubscription.reasonLabel")}</Label>
            <Input
              id="reason"
              placeholder={t("cancelSubscription.reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancelSubscription.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || loading}
            onClick={() => {
              if (subscriptionId) {
                onConfirm(subscriptionId, reason);
                setReason("");
              }
            }}
          >
            {loading ? t("cancelSubscription.processing") : t("cancelSubscription.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
