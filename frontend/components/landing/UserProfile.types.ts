export function formatAvatarStorageError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("bucket not found") ||
    (m.includes("not found") && m.includes("bucket"))
  ) {
    return "Avatar storage is not set up: apply the migration `supabase/migrations/20260325120009_avatars_storage.sql` to your Supabase project (e.g. run `supabase db push` from the project root), or paste a photo URL below and click Save changes.";
  }
  return message;
}

export type ProfilePayload = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  subscribed: boolean;
  subscription_type: string;
  created_at: string | null;
  updated_at: string | null;
};

export type SubscriptionPayload = {
  plan: string;
  plan_label: string;
  billing_interval: string;
  billing_label: string;
  status: string;
  price_id: string;
  price_display: string;
  current_period_start: string | null;
  current_period_end: string | null;
  period_start_label: string;
  period_end_label: string;
  subscribed_at_label: string;
  cancel_at_period_end: boolean;
};
