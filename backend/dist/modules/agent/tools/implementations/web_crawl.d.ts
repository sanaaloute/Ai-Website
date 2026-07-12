import { z } from "zod";
import { AgentTool } from "../types";
declare const webCrawlSchema: z.ZodObject<{
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    url: string;
}, {
    url: string;
}>;
export declare class WebCrawlTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        url: string;
    }, {
        url: string;
    }>;
    _call(args: z.infer<typeof webCrawlSchema>): Promise<string>;
}
export {};
