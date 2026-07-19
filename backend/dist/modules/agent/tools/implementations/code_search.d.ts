import { z } from "zod";
import { AgentTool } from "../types";
declare const codeSearchSchema: z.ZodObject<{
    query: z.ZodString;
    file_pattern: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    query: string;
    file_pattern?: string | undefined;
}, {
    query: string;
    file_pattern?: string | undefined;
}>;
export declare class CodeSearchTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        query: z.ZodString;
        file_pattern: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        query: string;
        file_pattern?: string | undefined;
    }, {
        query: string;
        file_pattern?: string | undefined;
    }>;
    _call(args: z.infer<typeof codeSearchSchema>): Promise<string>;
}
export {};
