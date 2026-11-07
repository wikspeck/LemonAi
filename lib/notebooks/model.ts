import { z } from "zod";

const base = { id: z.string().min(1).max(100), createdAt: z.string(), updatedAt: z.string(), revision: z.string() };
export const notebookSchema = z.object({ ...base, kind: z.literal("notebook"), title: z.string().max(200), description: z.string().max(2000), color: z.enum(["sage", "peach", "lilac", "blue", "yellow"]), icon: z.string().max(8), starred: z.boolean() });
export const sectionSchema = z.object({ ...base, kind: z.literal("section"), notebookId: z.string(), title: z.string().max(200), parentId: z.string().nullable() });
export const noteSchema = z.object({ ...base, kind: z.literal("note"), notebookId: z.string(), sectionId: z.string().nullable(), title: z.string().max(300), content: z.string().max(2_000_000), tags: z.array(z.string().max(100)).max(100), sourceIds: z.array(z.string()), starred: z.boolean() });
export const attachmentSchema = z.object({ ...base, kind: z.literal("attachment"), notebookId: z.string(), name: z.string(), mime: z.string(), size: z.number(), text: z.string().max(2_000_000) });
export const conversationSchema = z.object({ ...base, kind: z.literal("conversation"), notebookId: z.string(), noteId: z.string().nullable(), messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string(), sources: z.array(z.object({ id: z.string(), title: z.string(), excerpt: z.string() })).optional() })) });
export const flashcardSchema = z.object({ ...base, kind: z.literal("flashcard"), notebookId: z.string(), question: z.string(), answer: z.string() });
export const quizSchema = z.object({ ...base, kind: z.literal("quiz"), notebookId: z.string(), question: z.string(), options: z.array(z.string()).min(2).max(6), answer: z.number().int().min(0).max(5), explanation: z.string() });
export const entitySchema = z.discriminatedUnion("kind", [notebookSchema, sectionSchema, noteSchema, attachmentSchema, conversationSchema, flashcardSchema, quizSchema]);
export type Entity = z.infer<typeof entitySchema>;
export type Notebook = z.infer<typeof notebookSchema>;
export type Note = z.infer<typeof noteSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Section = z.infer<typeof sectionSchema>;
export function identity() { const now = new Date().toISOString(); return { id: crypto.randomUUID(), createdAt: now, updatedAt: now, revision: crypto.randomUUID() }; }
export function changed<T extends Entity>(record: T, patch: Partial<T>): T { return { ...record, ...patch, updatedAt: new Date().toISOString(), revision: crypto.randomUUID() }; }
export function resolveWrite(current: Entity | undefined, incoming: Entity, expected?: string): Entity {
  if (current && current.revision !== expected && current.revision !== incoming.revision) {
    return { ...incoming, ...identity(), ...("title" in incoming ? { title: `${incoming.title} (conflict copy)` } : {}) };
  }
  return incoming;
}
export function importCopies(records: Entity[]): Entity[] {
  const ids = new Map(records.map(r => [r.id, crypto.randomUUID()]));
  const ref = (id: string) => ids.get(id) ?? id;
  return records.map(r => ({ ...r, ...identity(), id: ref(r.id), ...("notebookId" in r ? { notebookId: ref(r.notebookId) } : {}), ...(r.kind === "section" ? { parentId: r.parentId ? ref(r.parentId) : null } : {}), ...(r.kind === "note" ? { sectionId: r.sectionId ? ref(r.sectionId) : null, sourceIds: r.sourceIds.map(ref) } : {}), ...(r.kind === "conversation" ? { noteId: r.noteId ? ref(r.noteId) : null } : {}) }));
}
