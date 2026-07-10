import { useCallback } from 'react';
import { getAiWebsiteApiKey, updateAiWebsiteApiKey } from '@/lib/api/client';

export interface UseApiKeyActionsDeps {
  apiKeyReady: boolean;
  setApiKeyReady: React.Dispatch<React.SetStateAction<boolean>>;
  apiKeyError: string | null;
  setApiKeyError: React.Dispatch<React.SetStateAction<string | null>>;
  showApiKeyDialog: boolean;
  setShowApiKeyDialog: React.Dispatch<React.SetStateAction<boolean>>;
  apiKeyInput: string;
  setApiKeyInput: React.Dispatch<React.SetStateAction<string>>;
  apiKeySaving: boolean;
  setApiKeySaving: React.Dispatch<React.SetStateAction<boolean>>;
  updateStatus: (s: string) => void;
  log: (msg: string) => void;
}

export function useApiKeyActions(deps: UseApiKeyActionsDeps) {
  const {
    apiKeyReady,
    setApiKeyReady,
    setApiKeyError,
    setShowApiKeyDialog,
    apiKeyInput,
    setApiKeyInput,
    setApiKeySaving,
    log,
  } = deps;

  const ensureAiWebsiteApiKey = useCallback(
    async (): Promise<boolean> => {
      if (apiKeyReady) {
        return true;
      }
      try {
        const result = await getAiWebsiteApiKey();
        if (!result.ok) {
          const isAuthError =
            result.status === 401 ||
            /unauthorized|invalid session|sign in/i.test(result.error);
          if (isAuthError) {
            // Session problem, not a missing API key. Let the auth flow handle login.
            setApiKeyReady(false);
            return false;
          }
          setApiKeyError(result.error || null);
          setShowApiKeyDialog(true);
          return false;
        }
        if (result.data.hasApiKey) {
          setApiKeyReady(true);
          setApiKeyError(null);
          return true;
        }
        setApiKeyError(null);
        setShowApiKeyDialog(true);
        return false;
      } catch {
        setApiKeyError('Could not verify your AI-Website API key right now.');
        setShowApiKeyDialog(true);
        return false;
      }
    },
    [apiKeyReady, setApiKeyReady, setApiKeyError, setShowApiKeyDialog]
  );

  const saveAiWebsiteApiKey = useCallback(async () => {
    const key = apiKeyInput.trim();
    if (!key) {
      setApiKeyError('Please paste your AI-Website API key.');
      return;
    }
    setApiKeySaving(true);
    setApiKeyError(null);
    try {
      const result = await updateAiWebsiteApiKey(key);
      if (!result.ok) {
        setApiKeyError(result.error || 'Could not save API key.');
        return;
      }
      if (!result.data.ok) {
        setApiKeyError('Could not save API key.');
        return;
      }
      setApiKeyReady(true);
      setShowApiKeyDialog(false);
      setApiKeyInput('');
      setApiKeyError(null);
      log('AI-Website API key validated. You can continue.');
    } catch {
      setApiKeyError('Network error while validating API key.');
    } finally {
      setApiKeySaving(false);
    }
  }, [apiKeyInput, setApiKeyInput, setApiKeySaving, setApiKeyError, setApiKeyReady, setShowApiKeyDialog, log]);

  return { ensureAiWebsiteApiKey, saveAiWebsiteApiKey };
}
