import { VercelService } from "../vercel.service";
import { DockerDeployRunner } from './docker.runner';
import { CoolifyDeployRunner } from './coolify.runner';
import { DeployParams, DeployProviderName, DeployResult, DomainCheck } from './deploy.types';
export declare class DeployService {
    private readonly vercel;
    private readonly docker;
    private readonly coolify;
    constructor(vercel: VercelService, docker: DockerDeployRunner, coolify: CoolifyDeployRunner);
    get activeProvider(): DeployProviderName;
    get configured(): boolean;
    checkDomain(domain: string): Promise<DomainCheck>;
    deploy(params: DeployParams): Promise<DeployResult>;
    status(deploymentUuid: string, appUuid: string): Promise<Record<string, unknown>>;
    private provider;
}
