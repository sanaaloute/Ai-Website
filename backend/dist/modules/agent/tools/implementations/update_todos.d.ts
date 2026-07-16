import { z } from "zod";
import { AgentTool } from "../types";
declare const updateTodosSchema: z.ZodObject<{
    merge: z.ZodBoolean;
    todos: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        content: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["pending", "in_progress", "completed"]>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        content?: string | undefined;
        status?: "completed" | "pending" | "in_progress" | undefined;
    }, {
        id: string;
        content?: string | undefined;
        status?: "completed" | "pending" | "in_progress" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    todos: {
        id: string;
        content?: string | undefined;
        status?: "completed" | "pending" | "in_progress" | undefined;
    }[];
    merge: boolean;
}, {
    todos: {
        id: string;
        content?: string | undefined;
        status?: "completed" | "pending" | "in_progress" | undefined;
    }[];
    merge: boolean;
}>;
export declare class UpdateTodosTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        merge: z.ZodBoolean;
        todos: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            content: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodEnum<["pending", "in_progress", "completed"]>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            content?: string | undefined;
            status?: "completed" | "pending" | "in_progress" | undefined;
        }, {
            id: string;
            content?: string | undefined;
            status?: "completed" | "pending" | "in_progress" | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        todos: {
            id: string;
            content?: string | undefined;
            status?: "completed" | "pending" | "in_progress" | undefined;
        }[];
        merge: boolean;
    }, {
        todos: {
            id: string;
            content?: string | undefined;
            status?: "completed" | "pending" | "in_progress" | undefined;
        }[];
        merge: boolean;
    }>;
    private findExpectedNextTodoIdInList;
    private findCurrentInProgressTodoIdInList;
    private validateSequentialUpdates;
    private validateFinalTodoOrder;
    _call(args: z.infer<typeof updateTodosSchema>): Promise<string>;
}
export {};
