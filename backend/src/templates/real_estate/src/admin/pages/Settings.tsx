import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, PageHeader, AdminCard, Skeleton } from '@/admin/components/ui';
import { getStoreSettings, updateStoreSettings, type StoreSettings } from '@/lib/pocketbase';
import { useToast } from '@/hooks/useToast';

const DEFAULT_SETTINGS: Partial<StoreSettings> = {
  name: 'AI-Website Real Estate',
  tagline: 'Find your place',
  footerText: '',
};

export default function AdminSettings() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<Partial<StoreSettings>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStoreSettings()
      .then((data) => {
        if (cancelled) return;
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      })
      .catch((err) => {
        if (cancelled) return;
        addToast({
          variant: 'error',
          title: 'Failed to load settings',
          message: err instanceof Error ? err.message : 'Could not connect to the server.',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.name?.trim()) {
      addToast({ variant: 'warning', title: 'Validation', message: 'Site name is required.' });
      return;
    }

    setSaving(true);
    try {
      await updateStoreSettings({
        name: settings.name.trim(),
        tagline: settings.tagline?.trim(),
        footerText: settings.footerText?.trim(),
      });
      addToast({ variant: 'success', title: 'Saved', message: 'Site settings have been updated.' });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Could not save settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Settings" />
        <AdminCard className="max-w-2xl space-y-4">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-24" />
        </AdminCard>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" />

      <AdminCard className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Site name"
            required
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
          />
          <Input
            label="Tagline"
            value={settings.tagline}
            onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
          />
          <Textarea
            label="Footer text"
            rows={3}
            value={settings.footerText}
            onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
          />
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={saving}>
              Save settings
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            These settings are persisted in PocketBase and used by the storefront header and footer.
          </p>
        </form>
      </AdminCard>
    </div>
  );
}
