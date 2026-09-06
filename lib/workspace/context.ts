import type { Concept, WorkspaceSource } from "@/lib/workspace/schema";

const MAX_CONTEXT_CHARACTERS = 48_000;

export function buildWorkspaceContext(
  title: string,
  language: string,
  sources: WorkspaceSource[],
  concepts: Concept[],
) {
  let remaining = MAX_CONTEXT_CHARACTERS;
  const selected: string[] = [];
  for (const source of [...sources].reverse()) {
    if (remaining <= 0) break;
    const content = source.content.slice(0, remaining);
    selected.unshift(`SOURCE: ${source.title}\n${content}`);
    remaining -= content.length;
  }
  const conceptSummary = concepts.slice(0, 24)
    .map((concept) => `${concept.id}: ${concept.name} — ${concept.explanation}`)
    .join("\n");
  return [
    `WORKSPACE_TOPIC\n${title}`,
    `SOURCE_LANGUAGE\n${language}`,
    `KNOWN_CONCEPTS\n${conceptSummary}`,
    selected.join("\n\n"),
  ].join("\n\n");
}
