import { z } from "zod";
import { AgentTool } from "../types";
declare const runCommandSchema: z.ZodObject<{
    command: z.ZodString;
}, "strip", z.ZodTypeAny, {
    command: string;
}, {
    command: string;
}>;
export declare class RunCommandTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        command: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        command: string;
    }, {
        command: string;
    }>;
    _call(args: z.infer<typeof runCommandSchema>): Promise<string>;
}
export {};
