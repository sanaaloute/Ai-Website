import { z } from "zod";
import { AgentTool } from "../types";
declare const readLogsSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["all", "client", "server", "build"]>>;
    level: z.ZodOptional<z.ZodEnum<["all", "info", "warn", "error"]>>;
    searchTerm: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type?: "all" | "client" | "server" | "build" | undefined;
    limit?: number | undefined;
    level?: "error" | "warn" | "info" | "all" | undefined;
    searchTerm?: string | undefined;
}, {
    type?: "all" | "client" | "server" | "build" | undefined;
    limit?: number | undefined;
    level?: "error" | "warn" | "info" | "all" | undefined;
    searchTerm?: string | undefined;
}>;
export declare class ReadLogsTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        type: z.ZodOptional<z.ZodEnum<["all", "client", "server", "build"]>>;
        level: z.ZodOptional<z.ZodEnum<["all", "info", "warn", "error"]>>;
        searchTerm: z.ZodOptional<z.ZodString>;
        limit: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "all" | "client" | "server" | "build" | undefined;
        limit?: number | undefined;
        level?: "error" | "warn" | "info" | "all" | undefined;
        searchTerm?: string | undefined;
    }, {
        type?: "all" | "client" | "server" | "build" | undefined;
        limit?: number | undefined;
        level?: "error" | "warn" | "info" | "all" | undefined;
        searchTerm?: string | undefined;
    }>;
    _call(args: z.infer<typeof readLogsSchema>): Promise<string>;
}
export {};
