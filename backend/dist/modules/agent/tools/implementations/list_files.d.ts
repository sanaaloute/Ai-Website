import { z } from "zod";
import { AgentTool } from "../types";
declare const listFilesSchema: z.ZodObject<{
    directory: z.ZodOptional<z.ZodString>;
    recursive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    directory?: string | undefined;
    recursive?: boolean | undefined;
}, {
    directory?: string | undefined;
    recursive?: boolean | undefined;
}>;
export declare class ListFilesTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        directory: z.ZodOptional<z.ZodString>;
        recursive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        directory?: string | undefined;
        recursive?: boolean | undefined;
    }, {
        directory?: string | undefined;
        recursive?: boolean | undefined;
    }>;
    _call(args: z.infer<typeof listFilesSchema>): Promise<string>;
}
export {};
