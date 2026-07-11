import { z } from "zod";
import { AgentTool } from "../types";
declare const setChatSummarySchema: z.ZodObject<{
    summary: z.ZodString;
}, "strip", z.ZodTypeAny, {
    summary: string;
}, {
    summary: string;
}>;
export declare class SetChatSummaryTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        summary: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        summary: string;
    }, {
        summary: string;
    }>;
    _call(args: z.infer<typeof setChatSummarySchema>): Promise<string>;
}
export {};
