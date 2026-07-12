import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
import { SandboxProvider } from '../tools';
import { promptToString, buildPromptContent } from '@/types';

export async function answerGeneratorNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>> {
  const tools = new SandboxProvider(deps.e2b, state.sandboxId, state.projectId);
  const aiCredentials = state.aiCredentials;

  const prompt = state.prompt;
  const promptString = promptToString(prompt);
  const relevantFiles = state.relevantFiles ?? [];

  const fileContents: Array<{ path: string; content: string }> = [];
  for (const filePath of relevantFiles.slice(0, 5)) {
    try {
      const content = await tools.readFile(filePath);
      fileContents.push({ path: filePath, content: content.slice(0, 2000) });
    } catch (e) {
      deps.logger.warn(`Could not read file for answer: ${filePath}`);
    }
  }

  const systemPrompt = `You are a helpful coding assistant. The user is asking a question about their web application codebase.

Rules:
- Answer based on the provided code context
- If you don't know, say so honestly
- Keep answers concise but complete
- Use markdown formatting for code snippets
- Do NOT suggest making code changes unless explicitly asked
- Do NOT ask follow-up questions`;

  let context = `User question: ${promptString}\n\nRelevant files:\n`;
  for (const fc of fileContents) {
    context += `\n--- ${fc.path} ---\n${fc.content}\n`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: buildPromptContent(context, prompt) },
  ];

  try {
    const resultText = await deps.aiGateway.chatCompletionsStream(
      messages,
      deps.modelResolver.resolveSequence('answer_generator'),
      aiCredentials,
      async (token) => {
        await deps.emit({ type: 'token', data: { content: token } });
      },
    );

    return {
      chatAnswer: resultText,
      messages: [{ role: 'assistant', content: resultText }],
    };
  } catch (e) {
    deps.logger.error(`Answer generator failed: ${e instanceof Error ? e.message : String(e)}`);
    return {
      chatAnswer: `I encountered an error while processing your question: ${e instanceof Error ? e.message : String(e)}`,
      error: e instanceof Error ? e.message : String(e),
      messages: [{ role: 'assistant', content: `Error: ${e instanceof Error ? e.message : String(e)}` }],
    };
  }
}
