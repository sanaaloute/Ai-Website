import { z } from "zod";
import { AgentTool } from "../types";
declare const grepSchema: z.ZodObject<{
    query: z.ZodString;
    include_pattern: z.ZodOptional<z.ZodString>;
    exclude_pattern: z.ZodOptional<z.ZodString>;
    case_sensitive: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit?: number | undefined;
    include_pattern?: string | undefined;
    exclude_pattern?: string | undefined;
    case_sensitive?: boolean | undefined;
}, {
    query: string;
    limit?: number | undefined;
    include_pattern?: string | undefined;
    exclude_pattern?: string | undefined;
    case_sensitive?: boolean | undefined;
}>;
export declare class GrepTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        query: z.ZodString;
        include_pattern: z.ZodOptional<z.ZodString>;
        exclude_pattern: z.ZodOptional<z.ZodString>;
        case_sensitive: z.ZodOptional<z.ZodBoolean>;
        limit: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        query: string;
        limit?: number | undefined;
        include_pattern?: string | undefined;
        exclude_pattern?: string | undefined;
        case_sensitive?: boolean | undefined;
    }, {
        query: string;
        limit?: number | undefined;
        include_pattern?: string | undefined;
        exclude_pattern?: string | undefined;
        case_sensitive?: boolean | undefined;
    }>;
    _call(args: z.infer<typeof grepSchema>): Promise<string>;
}
export {};
