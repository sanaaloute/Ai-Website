import { OnModuleInit } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
export declare class StorageService implements OnModuleInit {
    private readonly supabase;
    private readonly logger;
    private bucketEnsured;
    constructor(supabase: SupabaseService);
    onModuleInit(): Promise<void>;
    private path;
    ensureBucket(): Promise<void>;
    uploadLatest(userId: string, projectId: string, payload: Record<string, unknown>): Promise<string | null>;
    downloadLatest(userId: string, projectId: string): Promise<Record<string, unknown> | null>;
    uploadFile(userId: string, projectId: string, relativePath: string, content: string): Promise<string | null>;
    downloadFile(userId: string, projectId: string, relativePath: string): Promise<string | null>;
    uploadZip(userId: string, projectId: string, zipBuffer: Buffer): Promise<string | null>;
    getSignedZipUrl(userId: string, projectId: string, expiresIn?: number): Promise<string | null>;
    listFiles(userId: string, projectId: string): Promise<string[]>;
    deleteProjectFiles(userId: string, projectId: string): Promise<void>;
    deleteUserFiles(userId: string): Promise<void>;
    private deletePrefix;
    snapshotPath(userId: string, projectId: string): Promise<string>;
}
