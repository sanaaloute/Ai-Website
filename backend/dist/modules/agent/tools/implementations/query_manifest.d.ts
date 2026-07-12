import { z } from "zod";
import { AgentTool } from "../types";
declare const queryManifestSchema: z.ZodObject<{
    action: z.ZodEnum<["get_file_status", "list_changed", "is_protected"]>;
    file_path: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: "get_file_status" | "list_changed" | "is_protected";
    file_path?: string | undefined;
}, {
    action: "get_file_status" | "list_changed" | "is_protected";
    file_path?: string | undefined;
}>;
export declare class QueryManifestTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        action: z.ZodEnum<["get_file_status", "list_changed", "is_protected"]>;
        file_path: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        action: "get_file_status" | "list_changed" | "is_protected";
        file_path?: string | undefined;
    }, {
        action: "get_file_status" | "list_changed" | "is_protected";
        file_path?: string | undefined;
    }>;
    _call(args: z.infer<typeof queryManifestSchema>): Promise<string>;
}
export {};
