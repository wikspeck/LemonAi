export type Source = { id: string; title: string; text: string };
export type Excerpt = { id: string; title: string; excerpt: string };
export function retrieve(query: string, sources: Source[], limit = 8): Excerpt[] {
  const terms = [...new Set(query.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])];
  const chunks = sources.flatMap(source => {
    const text = source.text.slice(0, 2_000_000); const result = [];
    for (let start = 0; start < text.length; start += 1000) {
      const excerpt = text.slice(start, start + 1300);
      const haystack = `${source.title} ${excerpt}`.toLocaleLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      result.push({ id: `${source.id}:${start}`, title: source.title, excerpt, score });
    }
    return result;
  });
  return chunks.sort((a, b) => b.score - a.score).slice(0, limit).map(({ id, title, excerpt }) => ({ id, title, excerpt }));
}
export function modelFor(action: string, preference: "auto" | "llama" | "deepseek") {
  return preference === "auto" ? (["generate", "explain", "connections", "flashcards", "quiz", "chat"].includes(action) ? "deepseek" : "llama") : preference;
}
export function answerText(result: unknown): string {
  if (!result || typeof result !== "object") throw new Error("Empty AI response");
  const r = result as { response?: unknown; choices?: { message?: { content?: unknown } }[] };
  const content = typeof r.response === "string" ? r.response : r.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Empty AI response");
  // Never display or save internal reasoning, including an unfinished reasoning block.
  const answer = content.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<think>[\s\S]*$/gi, "").trim();
  if (!answer) throw new Error("The model used its output budget on reasoning. Try Llama or a shorter request.");
  return answer;
}
