import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EncryptionService } from './encryption.service';

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
}

@Injectable()
export class IntegrationTokenService {
  private readonly logger = new Logger(IntegrationTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async upsert(
    userId: string,
    provider: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: Date,
  ): Promise<void> {
    try {
      await this.prisma.user_integrations.upsert({
        where: { user_id_provider: { user_id: userId, provider } },
        update: {
          access_token: this.encryption.encrypt(accessToken),
          refresh_token: refreshToken ? this.encryption.encrypt(refreshToken) : null,
          expires_at: expiresAt ?? null,
        },
        create: {
          user_id: userId,
          provider,
          access_token: this.encryption.encrypt(accessToken),
          refresh_token: refreshToken ? this.encryption.encrypt(refreshToken) : null,
          expires_at: expiresAt ?? null,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to store ${provider} tokens for user ${userId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async get(userId: string, provider: string): Promise<StoredTokens | null> {
    try {
      const record = await this.prisma.user_integrations.findUnique({
        where: { user_id_provider: { user_id: userId, provider } },
      });
      if (!record) return null;

      const accessToken = this.encryption.decrypt(record.access_token);
      if (!accessToken) return null;

      return {
        accessToken,
        refreshToken: record.refresh_token ? this.encryption.decrypt(record.refresh_token) ?? undefined : undefined,
      };
    } catch (err) {
      this.logger.error(`Failed to load ${provider} tokens for user ${userId}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  async delete(userId: string, provider: string): Promise<void> {
    try {
      await this.prisma.user_integrations.deleteMany({
        where: { user_id: userId, provider },
      });
    } catch (err) {
      this.logger.error(`Failed to delete ${provider} tokens for user ${userId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
