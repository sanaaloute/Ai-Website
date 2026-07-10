import { Request, Response } from 'express';
import { User } from "../../types";
import { GithubService } from "../../lib/github.service";
import { DeployService } from "../../lib/deploy/deploy.service";
import { IntegrationTokenService } from "../../lib/integration-token.service";
import { E2BService } from "../../lib/e2b.service";
import { IdempotencyService } from "../../lib/idempotency.service";
import { SupabaseService } from "../../lib/supabase.service";
import { ProjectService } from "../project/project.service";
export declare class IntegrationController {
    private readonly github;
    private readonly deploy;
    private readonly tokens;
    private readonly e2b;
    private readonly supabase;
    private readonly idempotency;
    private readonly projectService;
    private readonly logger;
    constructor(github: GithubService, deploy: DeployService, tokens: IntegrationTokenService, e2b: E2BService, supabase: SupabaseService, idempotency: IdempotencyService, projectService: ProjectService);
    private cookieOptions;
    authorize(next: string, res: Response): void;
    callback(code: string, state: string, req: Request, res: Response): Promise<void | Response<any, Record<string, any>>>;
    githubStatus(user: User, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    githubPush(user: User, body: {
        repoName?: string;
        files?: Array<{
            path: string;
            content: string;
        }>;
        lovecodeProjectId?: string;
        aiWebsiteProjectId?: string;
    }, req: Request, res: Response): Promise<import("@/lib/github.service").PushResult>;
    githubDisconnect(user: User, res: Response): Promise<{
        success: boolean;
        disconnected: boolean;
    }>;
    checkDomain(domain: string): Promise<{
        available: boolean;
        message: string;
        conflictProjectName: string | null;
        success: boolean;
    }>;
    deploy(user: User, body: {
        repoUrl?: string;
        projectName?: string;
        customDomain?: string;
        projectId?: string;
        idempotencyKey?: string;
    }, req: Request, res: Response): Promise<import("../../lib/deploy/deploy.types").DeployResult>;
    vercelStatus(deploymentUuid: string, appUuid: string): Promise<Record<string, unknown>>;
    connectUserSupabase(sandboxId: string, body: {
        supabaseUrl?: string;
        supabaseAnonKey?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    userSupabaseStatus(sandboxId: string): Promise<{
        connected: boolean;
        supabaseUrl: string | null;
    }>;
    disconnectUserSupabase(sandboxId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private parseCookie;
    private resolveGithubTokens;
}
