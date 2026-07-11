import { z } from "zod";
import { AgentTool } from "../types";
declare const renameFileSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
}, {
    from: string;
    to: string;
}>;
export declare class RenameFileTool extends AgentTool {
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
    _call(args: z.infer<typeof renameFileSchema>): Promise<string>;
}
export {};
