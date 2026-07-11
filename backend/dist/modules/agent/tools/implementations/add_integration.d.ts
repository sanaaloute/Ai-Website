import { z } from "zod";
import { AgentTool } from "../types";
declare const addIntegrationSchema: z.ZodObject<{
    provider: z.ZodEnum<["supabase"]>;
}, "strip", z.ZodTypeAny, {
    provider: "supabase";
}, {
    provider: "supabase";
}>;
export declare class AddIntegrationTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        provider: z.ZodEnum<["supabase"]>;
    }, "strip", z.ZodTypeAny, {
        provider: "supabase";
    }, {
        provider: "supabase";
    }>;
    _call(args: z.infer<typeof addIntegrationSchema>): Promise<string>;
}
export {};
