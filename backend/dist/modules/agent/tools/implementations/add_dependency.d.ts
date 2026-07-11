import { z } from "zod";
import { AgentTool } from "../types";
declare const addDependencySchema: z.ZodObject<{
    package: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    dev: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    package: string;
    version?: string | undefined;
    dev?: boolean | undefined;
}, {
    package: string;
    version?: string | undefined;
    dev?: boolean | undefined;
}>;
export declare class AddDependencyTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        package: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
        dev: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        package: string;
        version?: string | undefined;
        dev?: boolean | undefined;
    }, {
        package: string;
        version?: string | undefined;
        dev?: boolean | undefined;
    }>;
    _call(args: z.infer<typeof addDependencySchema>): Promise<string>;
}
export {};
