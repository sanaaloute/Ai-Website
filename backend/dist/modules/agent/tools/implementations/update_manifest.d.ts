import { z } from "zod";
import { AgentTool } from "../types";
declare const updateManifestSchema: z.ZodObject<{
    file_path: z.ZodString;
    operation: z.ZodEnum<["created", "modified", "deleted"]>;
}, "strip", z.ZodTypeAny, {
    file_path: string;
    operation: "created" | "modified" | "deleted";
}, {
    file_path: string;
    operation: "created" | "modified" | "deleted";
}>;
export declare class UpdateManifestTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        file_path: z.ZodString;
        operation: z.ZodEnum<["created", "modified", "deleted"]>;
    }, "strip", z.ZodTypeAny, {
        file_path: string;
        operation: "created" | "modified" | "deleted";
    }, {
        file_path: string;
        operation: "created" | "modified" | "deleted";
    }>;
    _call(args: z.infer<typeof updateManifestSchema>): Promise<string>;
}
export {};
