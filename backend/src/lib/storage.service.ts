import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

const BUCKET = 'project-files';

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private bucketEnsured = false;

  constructor(private readonly supabase: SupabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureBucket();
  }

  private path(userId: string, projectId: string, name: string): string {
    return `${userId}/projects/${projectId}/${name}`;
  }

  async ensureBucket(): Promise<void> {
    if (this.bucketEnsured) return;
    try {
      const { data: buckets, error: listError } = await this.supabase.admin.storage.listBuckets();
      if (listError) {
        this.logger.error(`ensureBucket listBuckets error: ${listError.message}`);
        return;
      }
      if (!buckets?.find((b) => b.name === BUCKET)) {
        const { error } = await this.supabase.admin.storage.createBucket(BUCKET, { public: false });
        if (error) {
          this.logger.error(`ensureBucket createBucket error: ${error.message}`);
          return;
        }
        this.logger.log(`Created storage bucket: ${BUCKET}`);
      } else {
        this.logger.log(`Storage bucket already exists: ${BUCKET}`);
      }
      this.bucketEnsured = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`ensureBucket unexpected error: ${msg}`);
    }
  }

  async uploadLatest(userId: string, projectId: string, payload: Record<string, unknown>): Promise<string | null> {
    await this.ensureBucket();
    const path = this.path(userId, projectId, 'latest.json');
    const { error } = await this.supabase.admin.storage
      .from(BUCKET)
      .upload(path, JSON.stringify(payload), { contentType: 'application/json', upsert: true });
    if (error) {
      this.logger.error(`uploadLatest error: ${error.message}`);
      return null;
    }
    return path;
  }

  async downloadLatest(userId: string, projectId: string): Promise<Record<string, unknown> | null> {
    const path = this.path(userId, projectId, 'latest.json');
    const { data, error } = await this.supabase.admin.storage.from(BUCKET).download(path);
    if (error || !data) return null;
    try {
      return JSON.parse(await data.text());
    } catch {
      return null;
    }
  }

  async uploadFile(userId: string, projectId: string, relativePath: string, content: string): Promise<string | null> {
    await this.ensureBucket();
    const path = `${this.path(userId, projectId, 'files')}/${relativePath}`;
    const { error } = await this.supabase.admin.storage
      .from(BUCKET)
      .upload(path, content, { contentType: 'text/plain', upsert: true });
    if (error) {
      this.logger.error(`uploadFile error: ${error.message}`);
      return null;
    }
    return path;
  }

  async downloadFile(userId: string, projectId: string, relativePath: string): Promise<string | null> {
    const path = `${this.path(userId, projectId, 'files')}/${relativePath}`;
    const { data, error } = await this.supabase.admin.storage.from(BUCKET).download(path);
    if (error || !data) return null;
    return data.text();
  }

  async uploadZip(userId: string, projectId: string, zipBuffer: Buffer): Promise<string | null> {
    await this.ensureBucket();
    const path = this.path(userId, projectId, 'project.zip');
    const { error } = await this.supabase.admin.storage
      .from(BUCKET)
      .upload(path, zipBuffer, { contentType: 'application/zip', upsert: true });
    if (error) {
      this.logger.error(`uploadZip error: ${error.message}`);
      return null;
    }
    return path;
  }

  async getSignedZipUrl(userId: string, projectId: string, expiresIn = 600): Promise<string | null> {
    const path = this.path(userId, projectId, 'project.zip');
    const { data, error } = await this.supabase.admin.storage.from(BUCKET).createSignedUrl(path, expiresIn);
    if (error) {
      this.logger.error(`getSignedZipUrl error: ${error.message}`);
      return null;
    }
    return data?.signedUrl ?? null;
  }

  async listFiles(userId: string, projectId: string): Promise<string[]> {
    const prefix = `${userId}/projects/${projectId}/files/`;
    const { data, error } = await this.supabase.admin.storage.from(BUCKET).list(prefix);
    if (error) {
      this.logger.error(`listFiles error: ${error.message}`);
      return [];
    }
    return (data ?? []).map((item) => item.name);
  }

  async deleteProjectFiles(userId: string, projectId: string): Promise<void> {
    const prefix = `${userId}/projects/${projectId}/`;
    await this.deletePrefix(prefix);
  }

  async deleteUserFiles(userId: string): Promise<void> {
    const prefix = `${userId}/`;
    await this.deletePrefix(prefix);
  }

  private async deletePrefix(prefix: string): Promise<void> {
    await this.ensureBucket();
    const paths: string[] = [];
    let cursor: string | undefined;
    try {
      do {
        const { data, error } = await this.supabase.admin.storage.from(BUCKET).listV2({
          prefix,
          limit: 1000,
          with_delimiter: false,
          cursor,
        });
        if (error) {
          this.logger.error(`deletePrefix listV2 error: ${error.message}`);
          return;
        }
        for (const obj of data?.objects ?? []) {
          if (obj.key) {
            paths.push(obj.key);
          } else if (obj.name) {
            // Fallback if the storage backend does not populate `key`.
            const fallback = obj.name.startsWith(prefix) ? obj.name : `${prefix}${obj.name}`;
            paths.push(fallback);
          }
        }
        cursor = data?.nextCursor;
      } while (cursor);

      if (!paths.length) return;

      for (const batch of chunk(paths, 100)) {
        const { error } = await this.supabase.admin.storage.from(BUCKET).remove(batch);
        if (error) this.logger.error(`deletePrefix remove error: ${error.message}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`deletePrefix unexpected error: ${msg}`);
    }
  }

  async snapshotPath(userId: string, projectId: string): Promise<string> {
    return this.path(userId, projectId, 'latest.json');
  }
}
