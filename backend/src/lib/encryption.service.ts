import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { env } from '@/config/env';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;

  constructor() {
    const raw = env().tokenEncryptionKey;
    if (raw) {
      // Accept a 32-byte base64, hex, or arbitrary string (hashed to 32 bytes).
      let buf = Buffer.from(raw, 'base64');
      if (buf.length !== 32) {
        buf = Buffer.from(raw, 'hex');
      }
      if (buf.length !== 32) {
        buf = createHash('sha256').update(raw).digest();
      }
      this.key = buf;
    } else {
      this.logger.warn(
        'TOKEN_ENCRYPTION_KEY is not set; falling back to a key derived from ADMIN_JWT_SECRET. ' +
          'Set a dedicated TOKEN_ENCRYPTION_KEY in production.',
      );
      this.key = createHash('sha256').update(env().adminJwtSecret).digest();
    }
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(cipherText: string): string | null {
    try {
      const data = Buffer.from(cipherText, 'base64');
      const iv = data.subarray(0, 16);
      const authTag = data.subarray(16, 32);
      const encrypted = data.subarray(32);
      const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch (err) {
      this.logger.warn(`Token decryption failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }
}
