import { DeployParams, DeployProvider, DeployResult, DomainCheck } from './deploy.types';
export declare class CoolifyDeployRunner implements DeployProvider {
    readonly name: "coolify";
    private readonly logger;
    get configured(): boolean;
    checkDomain(domain: string): Promise<DomainCheck>;
    deploy(params: DeployParams): Promise<DeployResult>;
    status(deploymentUuid: string, appUuid: string): Promise<Record<string, unknown>>;
}
