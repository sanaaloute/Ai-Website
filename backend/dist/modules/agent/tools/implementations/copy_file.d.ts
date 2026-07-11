import { z } from "zod";
import { AgentTool } from "../types";
declare const copyFileSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
}, {
    from: string;
    to: string;
}>;
export declare class CopyFileTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        from: string;
        to: string;
    }, {
        from: string;
        to: string;
    }>;
    _call(args: z.infer<typeof copyFileSchema>): Promise<string>;
}
export {};
