import { z } from "zod";
import { AgentTool } from "../types";
declare const saveProjectSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
}, {
    description?: string | undefined;
}>;
export declare class SaveProjectTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
    }, {
        description?: string | undefined;
    }>;
    _call(args: z.infer<typeof saveProjectSchema>): Promise<string>;
}
export {};
