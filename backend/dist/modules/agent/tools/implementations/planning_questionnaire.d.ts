import { z } from "zod";
import { AgentTool } from "../types";
declare const planningQuestionnaireSchema: z.ZodObject<{
    questions: z.ZodArray<z.ZodEffects<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        question: z.ZodString;
        type: z.ZodEnum<["text", "radio", "checkbox"]>;
        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        required: z.ZodOptional<z.ZodBoolean>;
        placeholder: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "radio" | "checkbox";
        question: string;
        id?: string | undefined;
        options?: string[] | undefined;
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }, {
        type: "text" | "radio" | "checkbox";
        question: string;
        id?: string | undefined;
        options?: string[] | undefined;
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }>, {
        type: "text" | "radio" | "checkbox";
        question: string;
        id?: string | undefined;
        options?: string[] | undefined;
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }, {
        type: "text" | "radio" | "checkbox";
        question: string;
        id?: string | undefined;
        options?: string[] | undefined;
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    questions: {
        type: "text" | "radio" | "checkbox";
        question: string;
        id?: string | undefined;
        options?: string[] | undefined;
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }[];
}, {
    questions: {
        type: "text" | "radio" | "checkbox";
        question: string;
        id?: string | undefined;
        options?: string[] | undefined;
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }[];
}>;
export declare class PlanningQuestionnaireTool extends AgentTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        questions: z.ZodArray<z.ZodEffects<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            question: z.ZodString;
            type: z.ZodEnum<["text", "radio", "checkbox"]>;
            options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            required: z.ZodOptional<z.ZodBoolean>;
            placeholder: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "text" | "radio" | "checkbox";
            question: string;
            id?: string | undefined;
            options?: string[] | undefined;
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }, {
            type: "text" | "radio" | "checkbox";
            question: string;
            id?: string | undefined;
            options?: string[] | undefined;
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }>, {
            type: "text" | "radio" | "checkbox";
            question: string;
            id?: string | undefined;
            options?: string[] | undefined;
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }, {
            type: "text" | "radio" | "checkbox";
            question: string;
            id?: string | undefined;
            options?: string[] | undefined;
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        questions: {
            type: "text" | "radio" | "checkbox";
            question: string;
            id?: string | undefined;
            options?: string[] | undefined;
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }[];
    }, {
        questions: {
            type: "text" | "radio" | "checkbox";
            question: string;
            id?: string | undefined;
            options?: string[] | undefined;
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }[];
    }>;
    _call(args: z.infer<typeof planningQuestionnaireSchema>): Promise<string>;
}
export {};
