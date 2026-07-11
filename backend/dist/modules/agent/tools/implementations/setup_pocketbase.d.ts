import { z } from "zod";
import { AgentTool } from "../types";
declare const setupPocketBaseSchema: z.ZodObject<{
    templateId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    templateId?: string | undefined;
}, {
    templateId?: string | undefined;
}>;
export declare class SetupPocketBaseTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        templateId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        templateId?: string | undefined;
    }, {
        templateId?: string | undefined;
    }>;
    _call(args: z.infer<typeof setupPocketBaseSchema>): Promise<string>;
}
export {};
