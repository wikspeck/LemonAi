import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { createOpenAIClient, openAIErrorResponse } from "@/lib/openai/errors";
import { workspaceActionResultSchema, workspaceActionSchema } from "@/lib/workspace/schema";

const MODEL = "gpt-4o-mini";

const requestSchema = z.object({
  workspaceId: z.string().min(1),
  sourceText: z.string().trim().min(1).max(50_000),
  sourceLanguage: z.string().trim().min(1).max(100),
  action: workspaceActionSchema,
  note: z.object({ id: z.string().min(1), text: z.string().trim().min(1).max(5_000) }),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Die Anfrage muss gültiges JSON enthalten." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Die Lernaktion ist unvollständig." }, { status: 400 });
  }

  const openai = createOpenAIClient();
  if (!openai) {
    return Response.json({ error: "Der Analyse-Dienst ist noch nicht konfiguriert." }, { status: 500 });
  }

  try {
    const response = await openai.responses.parse({
      model: MODEL,
      max_output_tokens: 1_200,
      store: false,
      instructions: [
        "Führe genau eine Lernaktion zu einer Notiz aus und bleibe vollständig im bereitgestellten Quellenmaterial.",
        "explainSimpler: Fülle nur explanation mit einer einfacheren Erklärung.",
        "makeFlashcard: Fülle nur flashcard mit einer präzisen Karteikarte.",
        "testMe: Fülle nur question mit einer Multiple-Choice-Frage, vier Optionen, exakt passender correctAnswer und Erklärung.",
        "Alle nicht zur Aktion gehörenden Ergebnisfelder müssen null sein.",
        "Antworte in der angegebenen Quellsprache. Erfinde kein Hintergrundwissen.",
      ].join(" "),
      input: [
        { role: "user", content: `AKTION\n${parsed.data.action}\n\nNOTIZ\n${parsed.data.note.text}` },
        { role: "user", content: `QUELLENSPRACHE\n${parsed.data.sourceLanguage}\n\nQUELLENMATERIAL\n${parsed.data.sourceText}` },
      ],
      text: { format: zodTextFormat(workspaceActionResultSchema, "workspace_action") },
    });

    const result = response.output_parsed;
    const valid = result && result.action === parsed.data.action && (
      (result.action === "explainSimpler" && result.explanation) ||
      (result.action === "makeFlashcard" && result.flashcard) ||
      (result.action === "testMe" && result.question && result.question.options.includes(result.question.correctAnswer))
    );

    if (!valid) {
      return Response.json({ error: "Die Lernaktion lieferte kein gültiges Ergebnis." }, { status: 502 });
    }

    return Response.json(result);
  } catch (error) {
    return openAIErrorResponse(error);
  }
}
