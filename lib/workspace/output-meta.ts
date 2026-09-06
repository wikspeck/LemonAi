import type { OutputKind, WorkspaceOutput } from "@/lib/workspace/schema";

export const outputLabels: Record<OutputKind, string> = {
  summary: "Zusammenfassung",
  notes: "Notizen",
  explanation: "Erklärung",
  flashcards: "Karteikarten",
  quiz: "Quiz",
  timeline: "Zeitleiste",
  comparison: "Vergleich",
  keyTerms: "Begriffe",
};

export function outputCount(output: WorkspaceOutput) {
  switch (output.type) {
    case "notes": return `${output.data.items.length} Punkte`;
    case "flashcards": return `${output.data.cards.length} Karten`;
    case "quiz": return `${Object.values(output.data.quizzes).reduce((sum, questions) => sum + questions.length, 0)} Fragen`;
    case "timeline": return `${output.data.events.length} Ereignisse`;
    case "comparison": return `${output.data.rows.length} Aspekte`;
    case "keyTerms": return `${output.data.terms.length} Begriffe`;
    case "summary": return "Text";
    case "explanation": return "Erklärung";
  }
}
