import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getStoreSettings, type StoreSettings } from './pocketbase';

export const DEFAULT_SETTINGS: Partial<StoreSettings> = {
  name: 'LoveCode Shop',
  tagline: 'Built with LoveCode',
  currency: 'USD',
  supportEmail: 'support@example.com',
  footerText: '',
};

interface SettingsContextValue {
  settings: StoreSettings;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS as StoreSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStoreSettings();
      setSettings({ ...DEFAULT_SETTINGS, ...data } as StoreSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load store settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refetch }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
