import { z } from "zod";
import { AgentTool } from "../types";
declare const exitPlanSchema: z.ZodObject<{
    confirmation: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    confirmation: boolean;
}, {
    confirmation: boolean;
}>;
export declare class ExitPlanTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        confirmation: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        confirmation: boolean;
    }, {
        confirmation: boolean;
    }>;
    _call(args: z.infer<typeof exitPlanSchema>): Promise<string>;
}
export {};
