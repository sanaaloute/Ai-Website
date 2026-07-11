import { z } from "zod";
import { AgentTool } from "../types";
declare const deleteFileSchema: z.ZodObject<{
    path: z.ZodString;
}, "strip", z.ZodTypeAny, {
    path: string;
}, {
    path: string;
}>;
export declare class DeleteFileTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        path: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
    }, {
        path: string;
    }>;
    _call(args: z.infer<typeof deleteFileSchema>): Promise<string>;
}
export {};
