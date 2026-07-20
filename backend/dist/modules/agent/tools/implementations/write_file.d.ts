import { z } from "zod";
import { AgentTool } from "../types";
declare const writeFileSchema: z.ZodObject<{
    path: z.ZodString;
    content: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    content: string;
    path: string;
    description?: string | undefined;
}, {
    content: string;
    path: string;
    description?: string | undefined;
}>;
export declare class WriteFileTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        path: z.ZodString;
        content: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        content: string;
        path: string;
        description?: string | undefined;
    }, {
        content: string;
        path: string;
        description?: string | undefined;
    }>;
    _call(args: z.infer<typeof writeFileSchema>): Promise<string>;
}
export {};
