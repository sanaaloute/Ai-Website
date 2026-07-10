import { z } from "zod";
import { AgentTool } from "../types";
declare const writePlanSchema: z.ZodObject<{
    title: z.ZodString;
    summary: z.ZodString;
    plan: z.ZodString;
}, "strip", z.ZodTypeAny, {
    plan: string;
    title: string;
    summary: string;
}, {
    plan: string;
    title: string;
    summary: string;
}>;
export declare class WritePlanTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        title: z.ZodString;
        summary: z.ZodString;
        plan: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        plan: string;
        title: string;
        summary: string;
    }, {
        plan: string;
        title: string;
        summary: string;
    }>;
    _call(args: z.infer<typeof writePlanSchema>): Promise<string>;
}
export {};
