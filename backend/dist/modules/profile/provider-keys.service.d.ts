import { SupabaseService } from "../../lib/supabase.service";
import { AiGatewayService } from "../../lib/ai-gateway.service";
import { AiCredential, ProviderId } from "../../lib/llm-providers";
export interface ProviderKeyView {
    provider: ProviderId;
    keyPreview: string;
}
export interface ProviderKeysState {
    activeProvider: ProviderId | null;
    keys: ProviderKeyView[];
}
export declare class ProviderKeysService {
    private readonly supabase;
    private readonly ai;
    private readonly logger;
    constructor(supabase: SupabaseService, ai: AiGatewayService);
    private fetchRows;
    private getActiveProvider;
    private fetchLegacyKey;
    listKeys(userId: string): Promise<ProviderKeysState>;
    saveKey(userId: string, provider: ProviderId, apiKey: string): Promise<{
        ok: true;
        keyPreview: string;
        activeProvider: string | null;
        validated: boolean;
        validationWarning: string | null;
    } | {
        ok: false;
        error: string;
    }>;
    deleteKey(userId: string, provider: ProviderId): Promise<{
        activeProvider: string | null;
    }>;
    setActiveProvider(userId: string, provider: ProviderId): Promise<{
        ok: true;
        activeProvider: string;
    } | {
        ok: false;
        error: string;
    }>;
    resolveCredentials(userId: string): Promise<AiCredential[]>;
}
