import { z } from "zod";
import { AgentTool } from "../types";
declare const getSupabaseTableSchemaSchema: z.ZodObject<{
    tableName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tableName?: string | undefined;
}, {
    tableName?: string | undefined;
}>;
export declare class GetSupabaseTableSchemaTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        tableName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tableName?: string | undefined;
    }, {
        tableName?: string | undefined;
    }>;
    _call(args: z.infer<typeof getSupabaseTableSchemaSchema>): Promise<string>;
}
export {};
