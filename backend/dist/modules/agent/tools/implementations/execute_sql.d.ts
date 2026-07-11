import { z } from "zod";
import { AgentTool } from "../types";
declare const executeSqlSchema: z.ZodObject<{
    query: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    query: string;
    description?: string | undefined;
}, {
    query: string;
    description?: string | undefined;
}>;
export declare class ExecuteSqlTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        query: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        query: string;
        description?: string | undefined;
    }, {
        query: string;
        description?: string | undefined;
    }>;
    _call(args: z.infer<typeof executeSqlSchema>): Promise<string>;
}
export {};
