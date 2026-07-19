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
        status?: "pending" | "in_progress" | "completed" | undefined;
    }, {
        id: string;
        content?: string | undefined;
        status?: "pending" | "in_progress" | "completed" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    merge: boolean;
    todos: {
        id: string;
        content?: string | undefined;
        status?: "pending" | "in_progress" | "completed" | undefined;
    }[];
}, {
    merge: boolean;
    todos: {
        id: string;
        content?: string | undefined;
        status?: "pending" | "in_progress" | "completed" | undefined;
    }[];
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
            status?: "pending" | "in_progress" | "completed" | undefined;
        }, {
            id: string;
            content?: string | undefined;
            status?: "pending" | "in_progress" | "completed" | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        merge: boolean;
        todos: {
            id: string;
            content?: string | undefined;
            status?: "pending" | "in_progress" | "completed" | undefined;
        }[];
    }, {
        merge: boolean;
        todos: {
            id: string;
            content?: string | undefined;
            status?: "pending" | "in_progress" | "completed" | undefined;
        }[];
    }>;
    private findExpectedNextTodoIdInList;
    private findCurrentInProgressTodoIdInList;
    private validateSequentialUpdates;
    private validateFinalTodoOrder;
    _call(args: z.infer<typeof updateTodosSchema>): Promise<string>;
}
export {};
