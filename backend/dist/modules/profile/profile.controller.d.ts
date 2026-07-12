import { User } from "../../types";
import { SupabaseService } from "../../lib/supabase.service";
import { ProviderKeysService } from './provider-keys.service';
export declare class ProfileController {
    private readonly supabase;
    private readonly providerKeys;
    constructor(supabase: SupabaseService, providerKeys: ProviderKeysService);
    getProfile(user: User): Promise<{
        profile: Record<string, unknown> | {
            id: string;
            email: string | undefined;
            full_name: any;
            phone: null;
            avatar_url: any;
            subscribed: boolean;
            subscription_type: null;
            created_at: string;
            updated_at: string | undefined;
        };
        subscription: {
            plan: any;
            plan_label: any;
            billing_interval: any;
            status: any;
            stripe_price_id: any;
            price_display: string;
        } | null;
    }>;
    updateProfile(user: User, body: Record<string, unknown>): Promise<{
        ok: boolean;
    }>;
    getLlmProviders(): {
        ok: boolean;
        providers: {
            id: import("@/lib/llm-providers").ProviderId;
            label: string;
            keySiteUrl: string;
            models: string[];
        }[];
    };
    getProviderKeys(user: User): Promise<{
        activeProvider: import("@/lib/llm-providers").ProviderId | null;
        keys: import("./provider-keys.service").ProviderKeyView[];
        ok: boolean;
    }>;
    saveProviderKey(user: User, provider: string, body: {
        api_key?: string;
        apiKey?: string;
    }): Promise<{
        ok: true;
        keyPreview: string;
        activeProvider: string | null;
        validated: boolean;
        validationWarning: string | null;
        provider: import("@/lib/llm-providers").ProviderId;
    }>;
    deleteProviderKey(user: User, provider: string): Promise<{
        ok: boolean;
        provider: import("@/lib/llm-providers").ProviderId;
        activeProvider: string | null;
    }>;
    setActiveProvider(user: User, body: {
        provider?: string;
    }): Promise<{
        ok: true;
        activeProvider: string;
    }>;
    getApiKey(user: User): Promise<{
        ok: boolean;
        hasApiKey: boolean;
        keyPreview: string | null;
    }>;
    saveApiKey(user: User, body: {
        api_key?: string;
        apiKey?: string;
    }): Promise<{
        ok: boolean;
        hasApiKey: boolean;
        keyPreview: string;
        validated: boolean;
        validationWarning: string | null;
    }>;
    deleteApiKey(user: User): Promise<{
        ok: boolean;
        hasApiKey: boolean;
        keyPreview: null;
    }>;
    getConversationState(user: User | undefined, state?: string): {
        state: string;
        userId: string | null;
    };
    postConversationState(user: User | undefined, body: {
        action?: string;
        state?: unknown;
    }): {
        state: {};
        cleared: boolean;
        userId: string | null;
    };
    deleteConversationState(user: User | undefined): {
        state: {};
        cleared: boolean;
        userId: string | null;
    };
}
