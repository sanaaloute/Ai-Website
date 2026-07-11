import { z } from "zod";
import { AgentTool } from "../types";
declare const webSearchSchema: z.ZodObject<{
    query: z.ZodString;
}, "strip", z.ZodTypeAny, {
    query: string;
}, {
    query: string;
}>;
export declare class WebSearchTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        query: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        query: string;
    }, {
        query: string;
    }>;
    _call(args: z.infer<typeof webSearchSchema>): Promise<string>;
}
export {};
