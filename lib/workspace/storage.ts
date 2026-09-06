import { z } from "zod";

import {
  generatedWorkspaceSchema,
  workspaceSchema,
  workspaceStorageSchema,
  type QuizAttempt,
  type Workspace,
  type WorkspaceOutput,
} from "@/lib/workspace/schema";

const STORAGE_KEY = "lemon-ai.workspaces.v2";
const LEGACY_STORAGE_KEY = "lemon-ai.workspaces.v1";
const MAX_WORKSPACES = 16;

const legacyWorkspaceSchema = generatedWorkspaceSchema.safeExtend({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sourceText: z.string().min(1),
  request: generatedWorkspaceSchema.shape.request.extend({ originalPrompt: z.string() }),
});

const legacyStoredWorkspaceSchema = z.object({
  workspace: legacyWorkspaceSchema,
  progress: z.object({
    flashcardRatings: z.record(z.string(), z.enum(["again", "hard", "good", "easy"])),
    conceptMastery: z.record(z.string(), z.number().min(0).max(100)),
    quizAttempts: z.array(z.object({
      id: z.string().min(1),
      type: z.enum(["multipleChoice", "trueFalse", "shortAnswer", "fillBlank"]),
      score: z.number().int().nonnegative(),
      total: z.number().int().positive(),
      incorrectIds: z.array(z.string().min(1)),
      completedAt: z.string().datetime(),
    })),
    lastMode: z.enum(["overview", "notes", "flashcards", "quiz", "learn"]),
    noteEnhancements: z.record(z.string(), z.object({ simplerExplanation: z.string().nullable() })).optional(),
  }),
});

type LegacyStoredWorkspace = z.infer<typeof legacyStoredWorkspaceSchema>;

function migrateLegacy(item: LegacyStoredWorkspace): Workspace {
  const legacy = item.workspace;
  const base = {
    workspaceId: legacy.id,
    createdAt: legacy.createdAt,
    sourceIds: [`${legacy.id}-source-1`],
    prompt: legacy.request.originalPrompt,
  };
  const outputs: WorkspaceOutput[] = [];

  if (legacy.summary) {
    outputs.push({ ...base, id: `${legacy.id}-summary`, type: "summary", title: "Zusammenfassung", data: { text: legacy.summary } });
  }
  if (legacy.bulletPoints.length) {
    outputs.push({ ...base, id: `${legacy.id}-notes`, type: "notes", title: "Lernnotizen", data: { items: legacy.bulletPoints } });
  }
  if (legacy.explanation) {
    outputs.push({ ...base, id: `${legacy.id}-explanation`, type: "explanation", title: "Erklärung", data: { text: legacy.explanation } });
  }
  if (legacy.flashcards.length) {
    outputs.push({ ...base, id: `${legacy.id}-flashcards`, type: "flashcards", title: "Karteikarten", data: { cards: legacy.flashcards } });
  }
  const quizCount = Object.values(legacy.quizzes).reduce((sum, questions) => sum + questions.length, 0);
  if (quizCount) {
    outputs.push({ ...base, id: `${legacy.id}-quiz`, type: "quiz", title: "Quiz", data: { quizzes: legacy.quizzes } });
  }

  const activeType = item.progress.lastMode === "notes"
    ? "notes"
    : item.progress.lastMode === "flashcards"
      ? "flashcards"
      : item.progress.lastMode === "quiz" || item.progress.lastMode === "learn"
        ? "quiz"
        : null;
  const activeOutputId = activeType ? outputs.find((output) => output.type === activeType)?.id ?? null : null;
  const quizAttempts: QuizAttempt[] = item.progress.quizAttempts.map((attempt) => ({
    ...attempt,
    outputId: outputs.find((output) => output.type === "quiz")?.id ?? null,
  }));

  return {
    version: 2,
    id: legacy.id,
    title: legacy.title,
    sourceLanguage: legacy.sourceLanguage,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    sources: [{
      id: `${legacy.id}-source-1`,
      type: "text",
      title: "Erstes Lernmaterial",
      content: legacy.sourceText,
      createdAt: legacy.createdAt,
    }],
    prompts: legacy.request.originalPrompt ? [{
      id: `${legacy.id}-prompt-1`,
      text: legacy.request.originalPrompt,
      createdAt: legacy.createdAt,
      outputIds: outputs.map((output) => output.id),
    }] : [],
    concepts: legacy.concepts,
    outputs,
    activity: [{
      id: `${legacy.id}-activity-1`,
      type: "workspaceCreated",
      title: "Workspace aus bestehendem Lernset übernommen",
      createdAt: legacy.createdAt,
      outputId: null,
    }],
    progress: {
      flashcardRatings: item.progress.flashcardRatings,
      conceptMastery: item.progress.conceptMastery,
      quizAttempts,
      lastSection: activeOutputId ? "outputs" : "overview",
      activeOutputId,
    },
  };
}

export function loadWorkspaces(): Workspace[] {
  try {
    const currentRaw = window.localStorage.getItem(STORAGE_KEY);
    if (currentRaw) {
      const current = workspaceStorageSchema.safeParse(JSON.parse(currentRaw) as unknown);
      if (current.success) return current.data.workspaces;
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return [];
    const legacy = legacyStoredWorkspaceSchema.array().safeParse(JSON.parse(legacyRaw) as unknown);
    if (!legacy.success) return [];
    const migrated = legacy.data.map(migrateLegacy);
    saveWorkspaces(migrated);
    return migrated;
  } catch {
    return [];
  }
}

export function saveWorkspaces(workspaces: Workspace[]): boolean {
  try {
    const data = workspaceStorageSchema.parse({ version: 2, workspaces: workspaces.slice(0, MAX_WORKSPACES) });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function createWorkspaceProgress(conceptIds: string[]): Workspace["progress"] {
  return {
    flashcardRatings: {},
    conceptMastery: Object.fromEntries(conceptIds.map((conceptId) => [conceptId, 35])),
    quizAttempts: [],
    lastSection: "overview",
    activeOutputId: null,
  };
}

export function validateWorkspace(value: unknown) {
  return workspaceSchema.safeParse(value);
}
