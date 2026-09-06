import type { OutputKind } from "@/lib/workspace/schema";

const patterns: Array<[OutputKind, RegExp]> = [
  ["timeline", /zeitleiste|timeline|chronolog|zeitstrahl/u],
  ["comparison", /vergleich|vergleiche|gegenüber|difference|compare|comparison/u],
  ["flashcards", /karteikart|flashcard|lernkarte/u],
  ["keyTerms", /begriff|vokabel|key\s*term|glossar|definition/u],
  ["notes", /stichpunkt|lernzettel|notiz|notes|bullet/u],
  ["summary", /zusammenfass|summary|fasse/u],
  ["explanation", /erklär|erklaer|explain|teach/u],
  ["quiz", /quiz|teste|test me|frage|prüfung|pruefung|klassenarbeit|practice/u],
];

export function inferOutputKind(prompt: string): OutputKind {
  const normalized = prompt.toLocaleLowerCase();
  const matches = patterns
    .map(([kind, pattern]) => ({ kind, index: normalized.search(pattern) }))
    .filter((match) => match.index >= 0)
    .sort((a, b) => a.index - b.index);
  return matches[0]?.kind ?? "quiz";
}

export function requestedAmount(prompt: string, fallback: number) {
  const amount = Number(prompt.match(/\b(\d{1,2})\b/u)?.[1] ?? fallback);
  return Math.max(2, Math.min(30, amount));
}

export function outputTokenLimit(kind: OutputKind, prompt: string) {
  const amount = requestedAmount(prompt, 8);
  if (kind === "summary" || kind === "explanation") return 1_800;
  if (kind === "comparison" || kind === "timeline" || kind === "keyTerms") return Math.min(4_500, 1_400 + amount * 170);
  return Math.min(6_000, 1_600 + amount * 230);
}
