import { z } from "zod";
import { AgentTool } from "../types";
declare const runTypeChecksSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare class RunTypeChecksTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    _call(_args: z.infer<typeof runTypeChecksSchema>): Promise<string>;
}
export {};
