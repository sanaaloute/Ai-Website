import { E2BService } from "../../../lib/e2b.service";
import { DatabaseStatus } from '../state';
export declare class DatabaseSeederService {
    private readonly e2b;
    private readonly logger;
    constructor(e2b: E2BService);
    verifyAndSeed(sandboxId: string, category: string, dbSchemaTemplate?: Record<string, unknown>): Promise<DatabaseStatus>;
    private buildStatus;
    private verifyAndSeedPrisma;
    private extractExpectedCollections;
    private authenticateAdmin;
    private listCollections;
    private createMissingCollections;
    private createCollection;
    private countRecords;
    private createRecord;
    private generateSampleRecords;
    private getTemplates;
    private generateValue;
}
