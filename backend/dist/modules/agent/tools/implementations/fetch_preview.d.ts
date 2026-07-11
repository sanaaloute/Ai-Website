import { z } from "zod";
import { AgentTool } from "../types";
declare const fetchPreviewSchema: z.ZodObject<{
    path: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path?: string | undefined;
}, {
    path?: string | undefined;
}>;
export declare class FetchPreviewTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        path: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path?: string | undefined;
    }, {
        path?: string | undefined;
    }>;
    _call(args: z.infer<typeof fetchPreviewSchema>): Promise<string>;
}
export {};
