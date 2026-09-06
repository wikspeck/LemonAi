import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { createOpenAIService } from "@/lib/openai/client";
import { apiError, openAIConfigurationError, openAIErrorResponse } from "@/lib/openai/errors";
import { workspaceActionResultSchema, workspaceActionSchema } from "@/lib/workspace/schema";

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
    return apiError("Die Anfrage muss gültiges JSON enthalten.", "INVALID_INPUT", 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Die Lernaktion ist unvollständig.", "INVALID_INPUT", 400);
  }

  const service = await createOpenAIService();
  if (!service) return openAIConfigurationError();

  try {
    const response = await service.client.responses.parse({
      model: service.model,
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
      return apiError("Die Lernaktion lieferte kein gültiges Ergebnis.", "INVALID_OUTPUT", 502);
    }

    return Response.json(result);
  } catch (error) {
    return openAIErrorResponse(error);
  }
}
