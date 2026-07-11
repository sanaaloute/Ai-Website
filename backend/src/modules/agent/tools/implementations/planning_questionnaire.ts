import { z } from "zod";
import { AgentTool } from "../types";

const QuestionSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe(
        "Unique identifier for this question (auto-generated if omitted)"
      ),
    question: z.string().describe("The question text to display to the user"),
    type: z
      .enum(["text", "radio", "checkbox"])
      .describe(
        "text for free-form input, radio for single choice, checkbox for multiple choice"
      ),
    options: z
      .array(z.string())
      .min(1)
      .max(3)
      .optional()
      .describe(
        "Options for radio/checkbox questions. Keep to max 3 — users can always provide a custom answer via the free-form text input. Omit for text questions."
      ),
    required: z
      .boolean()
      .optional()
      .describe("Whether this question requires an answer (defaults to true)"),
    placeholder: z
      .string()
      .optional()
      .describe("Placeholder text for text inputs"),
  })
  .refine((q) => q.type === "text" || (q.options && q.options.length >= 1), {
    message: "options are required for radio and checkbox questions",
    path: ["options"],
  });

const planningQuestionnaireSchema = z.object({
  questions: z
    .array(QuestionSchema)
    .min(1, "questions array must not be empty")
    .max(3, "questions array must have at most 3 questions")
    .describe("A non empty array of 1-3 questions to present to the user"),
});

export class PlanningQuestionnaireTool extends AgentTool {
  name = "planning_questionnaire";
  description = `Present a structured questionnaire to gather requirements from the user.

Use this tool when:
- The user wants to create a NEW app or project
- The request is vague or open-ended
- There are multiple reasonable interpretations
Skip when the request is a specific, concrete change.

Each question object has these fields:
- "question" (string, REQUIRED): The question text shown to the user
- "type" (string, REQUIRED): One of "text", "radio", or "checkbox"
- "options" (string array, REQUIRED for radio/checkbox, OMIT for text): 1-3 predefined choices
- "id" (string, optional): Unique identifier, auto-generated if omitted
- "required" (boolean, optional): Defaults to true
- "placeholder" (string, optional): Placeholder for text inputs`;
  schema = planningQuestionnaireSchema;

  async _call(
    args: z.infer<typeof planningQuestionnaireSchema>
  ): Promise<string> {
    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args: { count: args.questions.length } },
    });

    // Auto-generate missing IDs
    const questions = args.questions.map((q) => ({
      ...q,
      id: q.id || `q_${Math.random().toString(36).slice(2, 10)}`,
    }));

    this.agentContext.streamWriter.write({
      type: "questionnaire",
      data: { questions },
    });

    this.agentContext.streamWriter.write({
      type: "tool_end",
      data: {
        tool: this.name,
        result: `Presented ${questions.length} questions to the user`,
      },
    });

    return `Presented ${questions.length} questions to the user. Their answers will be included in their next message.`;
  }
}
