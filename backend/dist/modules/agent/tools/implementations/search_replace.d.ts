import { z } from "zod";
import { AgentTool } from "../types";
declare const searchReplaceSchema: z.ZodObject<{
    file_path: z.ZodString;
    old_string: z.ZodString;
    new_string: z.ZodString;
}, "strip", z.ZodTypeAny, {
    file_path: string;
    old_string: string;
    new_string: string;
}, {
    file_path: string;
    old_string: string;
    new_string: string;
}>;
export declare class SearchReplaceTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        file_path: z.ZodString;
        old_string: z.ZodString;
        new_string: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        file_path: string;
        old_string: string;
        new_string: string;
    }, {
        file_path: string;
        old_string: string;
        new_string: string;
    }>;
    _call(args: z.infer<typeof searchReplaceSchema>): Promise<string>;
}
export {};
