import { z } from "zod";

import { apiError, workersAIErrorResponse } from "@/lib/cloudflare-ai/errors";
import { generateStructured } from "@/lib/cloudflare-ai/structured-output";
import { buildWorkspaceContext } from "@/lib/workspace/context";
import { inferOutputKind, outputTokenLimit, requestedAmount } from "@/lib/workspace/intent";
import {
  conceptSchema,
  generatedOutputSchemas,
  workspaceOutputSchema,
  workspaceSourceSchema,
  type OutputKind,
  type WorkspaceOutput,
} from "@/lib/workspace/schema";

const requestSchema = z.object({
  workspace: z.object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(160),
    sourceLanguage: z.string().trim().min(1).max(100),
    sources: z.array(workspaceSourceSchema).min(1).max(20),
    concepts: z.array(conceptSchema).min(1).max(50),
  }),
  prompt: z.string().trim().min(1).max(2_000),
});

function commonInstructions(kind: OutputKind, amount: number) {
  return [
    `Create exactly one ${kind} learning output, aiming for ${amount} items where the format uses items.`,
    "Use only facts directly supported by the supplied workspace sources.",
    "Follow the user's request for scope, difficulty, brevity, and language.",
    "Use the source language unless the user explicitly requests another language.",
    "Quiz correct answers must be supported by the sources; multiple-choice correctAnswer must exactly equal one option.",
    "Use short unique IDs and only use known concept IDs; otherwise set conceptId to null.",
    "Return only the requested structured object.",
  ].join(" ");
}

async function generateOutput(kind: OutputKind, prompt: string, context: string) {
  const amount = requestedAmount(prompt, kind === "flashcards" || kind === "quiz" ? 8 : 6);
  const options = {
    instructions: commonInstructions(kind, amount),
    input: `${context}\n\nUSER_REQUEST\n${prompt}`,
    maxOutputTokens: outputTokenLimit(kind, prompt),
  };
  switch (kind) {
    case "summary": return generateStructured({ ...options, schema: generatedOutputSchemas.summary, schemaName: "summary_output" });
    case "notes": return generateStructured({ ...options, schema: generatedOutputSchemas.notes, schemaName: "notes_output" });
    case "explanation": return generateStructured({ ...options, schema: generatedOutputSchemas.explanation, schemaName: "explanation_output" });
    case "flashcards": return generateStructured({ ...options, schema: generatedOutputSchemas.flashcards, schemaName: "flashcard_output" });
    case "quiz": return generateStructured({ ...options, schema: generatedOutputSchemas.quiz, schemaName: "quiz_output" });
    case "timeline": return generateStructured({ ...options, schema: generatedOutputSchemas.timeline, schemaName: "timeline_output" });
    case "comparison": return generateStructured({ ...options, schema: generatedOutputSchemas.comparison, schemaName: "comparison_output" });
    case "keyTerms": return generateStructured({ ...options, schema: generatedOutputSchemas.keyTerms, schemaName: "key_terms_output" });
  }
}

function makeOutput(
  kind: OutputKind,
  generated: Awaited<ReturnType<typeof generateOutput>>,
  workspaceId: string,
  sourceIds: string[],
  prompt: string,
): WorkspaceOutput {
  const base = { id: crypto.randomUUID(), workspaceId, createdAt: new Date().toISOString(), sourceIds, prompt };
  switch (kind) {
    case "summary": {
      const data = generatedOutputSchemas.summary.parse(generated);
      return { ...base, type: kind, title: data.title, data: { text: data.text } };
    }
    case "notes": {
      const data = generatedOutputSchemas.notes.parse(generated);
      return { ...base, type: kind, title: data.title, data: { items: data.items } };
    }
    case "explanation": {
      const data = generatedOutputSchemas.explanation.parse(generated);
      return { ...base, type: kind, title: data.title, data: { text: data.text } };
    }
    case "flashcards": {
      const data = generatedOutputSchemas.flashcards.parse(generated);
      return { ...base, type: kind, title: data.title, data: { cards: data.cards } };
    }
    case "quiz": {
      const data = generatedOutputSchemas.quiz.parse(generated);
      return { ...base, type: kind, title: data.title, data: { quizzes: data.quizzes } };
    }
    case "timeline": {
      const data = generatedOutputSchemas.timeline.parse(generated);
      return { ...base, type: kind, title: data.title, data: { events: data.events } };
    }
    case "comparison": {
      const data = generatedOutputSchemas.comparison.parse(generated);
      return { ...base, type: kind, title: data.title, data: { subjects: data.subjects, rows: data.rows } };
    }
    case "keyTerms": {
      const data = generatedOutputSchemas.keyTerms.parse(generated);
      return { ...base, type: kind, title: data.title, data: { terms: data.terms } };
    }
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Die Anfrage muss gültiges JSON enthalten.", "INVALID_INPUT", 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return apiError("Workspace oder Auftrag ist unvollständig.", "INVALID_INPUT", 400);

  const { workspace, prompt } = parsed.data;
  const kind = inferOutputKind(prompt);
  try {
    const generated = await generateOutput(
      kind,
      prompt,
      buildWorkspaceContext(workspace.title, workspace.sourceLanguage, workspace.sources, workspace.concepts),
    );
    const output = makeOutput(kind, generated, workspace.id, workspace.sources.map((source) => source.id), prompt);
    return Response.json(workspaceOutputSchema.parse(output));
  } catch (error) {
    return workersAIErrorResponse(error);
  }
}
