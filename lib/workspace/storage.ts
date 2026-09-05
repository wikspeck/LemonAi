import { storedWorkspaceSchema, type StoredWorkspace, type WorkspaceProgress } from "@/lib/workspace/schema";

const STORAGE_KEY = "lemon-ai.workspaces.v1";
const MAX_WORKSPACES = 16;

export function loadWorkspaces(): StoredWorkspace[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const result = storedWorkspaceSchema.array().safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export function saveWorkspaces(workspaces: StoredWorkspace[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces.slice(0, MAX_WORKSPACES)));
    return true;
  } catch {
    return false;
  }
}

export function createProgress(workspace: StoredWorkspace["workspace"]): WorkspaceProgress {
  return {
    flashcardRatings: {},
    conceptMastery: Object.fromEntries(workspace.concepts.map((concept) => [concept.id, 35])),
    quizAttempts: [],
    lastMode: "overview",
    noteEnhancements: {},
  };
}
