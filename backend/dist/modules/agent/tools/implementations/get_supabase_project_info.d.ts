import { z } from "zod";
import { AgentTool } from "../types";
declare const getSupabaseProjectInfoSchema: z.ZodObject<{
    includeDbFunctions: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    includeDbFunctions?: boolean | undefined;
}, {
    includeDbFunctions?: boolean | undefined;
}>;
export declare class GetSupabaseProjectInfoTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        includeDbFunctions: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        includeDbFunctions?: boolean | undefined;
    }, {
        includeDbFunctions?: boolean | undefined;
    }>;
    _call(args: z.infer<typeof getSupabaseProjectInfoSchema>): Promise<string>;
}
export {};
