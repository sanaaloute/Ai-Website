/**
 * Sample prompt ideas for the homepage chat input.
 * Static prompt catalog for the landing page.
 */

export type PromptIdea = {
  id: string;
  title: string;
  description: string;
  sector: string;
};

export function pickRandomIdeas(
  pool: PromptIdea[],
  count: number
): PromptIdea[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}
