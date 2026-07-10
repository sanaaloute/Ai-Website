import { DeployParams, DeployProvider, DeployResult, DomainCheck } from './deploy.types';
export declare class DockerDeployRunner implements DeployProvider {
    readonly name: "docker";
    private readonly logger;
    get configured(): boolean;
    checkDomain(domain: string): Promise<DomainCheck>;
    deploy(params: DeployParams): Promise<DeployResult>;
    status(deploymentUuid: string, appUuid: string): Promise<Record<string, unknown>>;
    private buildRunArgs;
    private detectFramework;
    private container;
    private isReserved;
    private useTls;
    private siteSecret;
    private slugFromDomain;
    private sanitize;
}
