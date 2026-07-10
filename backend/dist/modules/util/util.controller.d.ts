import { Response } from 'express';
export declare class UtilController {
    private readonly logger;
    screenshot(url: string, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    search(): {
        results: never[];
        message: string;
    };
}
