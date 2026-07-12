import { z } from "zod";
import { AgentTool } from "../types";
declare const readFileSchema: z.ZodObject<{
    path: z.ZodString;
    start_line_one_indexed: z.ZodOptional<z.ZodNumber>;
    end_line_one_indexed_inclusive: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    path: string;
    start_line_one_indexed?: number | undefined;
    end_line_one_indexed_inclusive?: number | undefined;
}, {
    path: string;
    start_line_one_indexed?: number | undefined;
    end_line_one_indexed_inclusive?: number | undefined;
}>;
export declare class ReadFileTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        path: z.ZodString;
        start_line_one_indexed: z.ZodOptional<z.ZodNumber>;
        end_line_one_indexed_inclusive: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        start_line_one_indexed?: number | undefined;
        end_line_one_indexed_inclusive?: number | undefined;
    }, {
        path: string;
        start_line_one_indexed?: number | undefined;
        end_line_one_indexed_inclusive?: number | undefined;
    }>;
    _call(args: z.infer<typeof readFileSchema>): Promise<string>;
}
export {};
