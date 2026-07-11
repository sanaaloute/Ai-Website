import { z } from "zod";
import { AgentTool } from "../types";
declare const editFileSchema: z.ZodObject<{
    path: z.ZodString;
    content: z.ZodString;
    instructions: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    content: string;
    instructions?: string | undefined;
}, {
    path: string;
    content: string;
    instructions?: string | undefined;
}>;
export declare class EditFileTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        path: z.ZodString;
        content: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        content: string;
        instructions?: string | undefined;
    }, {
        path: string;
        content: string;
        instructions?: string | undefined;
    }>;
    _call(args: z.infer<typeof editFileSchema>): Promise<string>;
}
export {};
