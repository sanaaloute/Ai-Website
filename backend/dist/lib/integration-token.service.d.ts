import { PrismaService } from './prisma.service';
import { EncryptionService } from './encryption.service';
export interface StoredTokens {
    accessToken: string;
    refreshToken?: string;
}
export declare class IntegrationTokenService {
    private readonly prisma;
    private readonly encryption;
    private readonly logger;
    constructor(prisma: PrismaService, encryption: EncryptionService);
    upsert(userId: string, provider: string, accessToken: string, refreshToken?: string, expiresAt?: Date): Promise<void>;
    get(userId: string, provider: string): Promise<StoredTokens | null>;
    delete(userId: string, provider: string): Promise<void>;
}
