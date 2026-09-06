import { z } from "zod";

const requiredText = z.string().trim().min(1);
const id = z.string().trim().min(1);
const timestamp = z.string().datetime();

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const detailLevelSchema = z.enum(["short", "balanced", "detailed"]);
export const studyModuleSchema = z.enum([
  "summary",
  "bulletPoints",
  "explanation",
  "flashcards",
  "multipleChoiceQuiz",
  "trueFalseQuiz",
  "shortAnswerQuiz",
  "fillBlank",
  "learnMode",
]);

export const conceptSchema = z.object({
  id,
  name: requiredText,
  explanation: requiredText,
  importance: z.enum(["core", "supporting", "detail"]),
});

export const noteSchema = z.object({
  id,
  text: requiredText,
  importance: z.enum(["core", "supporting", "detail"]),
  conceptIds: z.array(id).max(6),
});

export const flashcardSchema = z.object({
  id,
  front: requiredText,
  back: requiredText,
  conceptId: id.nullable(),
});

export const multipleChoiceQuestionSchema = z.object({
  id,
  question: requiredText,
  options: z.array(requiredText).length(4),
  correctAnswer: requiredText,
  explanation: requiredText,
  conceptId: id.nullable(),
  difficulty: difficultySchema,
});

export const trueFalseQuestionSchema = z.object({
  id,
  statement: requiredText,
  correctAnswer: z.boolean(),
  explanation: requiredText,
  conceptId: id.nullable(),
});

export const shortAnswerQuestionSchema = z.object({
  id,
  question: requiredText,
  expectedAnswer: requiredText,
  acceptedAnswers: z.array(requiredText).min(1).max(5),
  explanation: requiredText,
  conceptId: id.nullable(),
});

export const fillBlankQuestionSchema = z.object({
  id,
  sentence: requiredText,
  answer: requiredText,
  acceptedAnswers: z.array(requiredText).min(1).max(5),
  explanation: requiredText,
  conceptId: id.nullable(),
});

export const quizCollectionSchema = z.object({
  multipleChoice: z.array(multipleChoiceQuestionSchema).max(20),
  trueFalse: z.array(trueFalseQuestionSchema).max(20),
  shortAnswer: z.array(shortAnswerQuestionSchema).max(20),
  fillBlank: z.array(fillBlankQuestionSchema).max(20),
});

export const intentSchema = z.object({
  difficulty: difficultySchema,
  detailLevel: detailLevelSchema,
  requestedModules: z.array(studyModuleSchema).min(1),
  preferences: z.array(requiredText).max(10),
});

export const generatedWorkspaceSchema = z.object({
  title: requiredText,
  sourceLanguage: requiredText,
  request: intentSchema,
  summary: z.string(),
  bulletPoints: z.array(noteSchema).max(30),
  explanation: z.string(),
  concepts: z.array(conceptSchema).min(1).max(30),
  flashcards: z.array(flashcardSchema).max(30),
  quizzes: quizCollectionSchema,
}).superRefine((workspace, context) => {
  const conceptIds = new Set(workspace.concepts.map((concept) => concept.id));
  for (const [index, note] of workspace.bulletPoints.entries()) {
    if (note.conceptIds.some((conceptId) => !conceptIds.has(conceptId))) {
      context.addIssue({ code: "custom", path: ["bulletPoints", index, "conceptIds"], message: "Unknown concept ID" });
    }
  }
  for (const [index, card] of workspace.flashcards.entries()) {
    if (card.conceptId && !conceptIds.has(card.conceptId)) {
      context.addIssue({ code: "custom", path: ["flashcards", index, "conceptId"], message: "Unknown concept ID" });
    }
  }
  for (const [index, question] of workspace.quizzes.multipleChoice.entries()) {
    if (!question.options.includes(question.correctAnswer)) {
      context.addIssue({ code: "custom", path: ["quizzes", "multipleChoice", index, "correctAnswer"], message: "Answer must match one option" });
    }
    if (question.conceptId && !conceptIds.has(question.conceptId)) {
      context.addIssue({ code: "custom", path: ["quizzes", "multipleChoice", index, "conceptId"], message: "Unknown concept ID" });
    }
  }
});

export const workspaceSourceSchema = z.object({
  id,
  type: z.literal("text"),
  title: requiredText,
  content: requiredText,
  createdAt: timestamp,
});

const outputBase = {
  id,
  workspaceId: id,
  title: requiredText,
  createdAt: timestamp,
  sourceIds: z.array(id).min(1),
  prompt: z.string(),
};

export const timelineEventSchema = z.object({
  id,
  date: requiredText,
  title: requiredText,
  description: requiredText,
  conceptId: id.nullable(),
});

export const comparisonRowSchema = z.object({
  id,
  aspect: requiredText,
  values: z.array(requiredText).min(2).max(5),
});

export const keyTermSchema = z.object({
  id,
  term: requiredText,
  definition: requiredText,
  conceptId: id.nullable(),
});

export const summaryOutputSchema = z.object({
  ...outputBase,
  type: z.literal("summary"),
  data: z.object({ text: requiredText }),
});
export const notesOutputSchema = z.object({
  ...outputBase,
  type: z.literal("notes"),
  data: z.object({ items: z.array(noteSchema).min(1).max(30) }),
});
export const explanationOutputSchema = z.object({
  ...outputBase,
  type: z.literal("explanation"),
  data: z.object({ text: requiredText }),
});
export const flashcardDeckOutputSchema = z.object({
  ...outputBase,
  type: z.literal("flashcards"),
  data: z.object({ cards: z.array(flashcardSchema).min(1).max(30) }),
});
export const quizOutputSchema = z.object({
  ...outputBase,
  type: z.literal("quiz"),
  data: z.object({ quizzes: quizCollectionSchema }),
});
export const timelineOutputSchema = z.object({
  ...outputBase,
  type: z.literal("timeline"),
  data: z.object({ events: z.array(timelineEventSchema).min(2).max(30) }),
});
export const comparisonOutputSchema = z.object({
  ...outputBase,
  type: z.literal("comparison"),
  data: z.object({
    subjects: z.array(requiredText).min(2).max(5),
    rows: z.array(comparisonRowSchema).min(1).max(20),
  }),
});
export const keyTermsOutputSchema = z.object({
  ...outputBase,
  type: z.literal("keyTerms"),
  data: z.object({ terms: z.array(keyTermSchema).min(1).max(40) }),
});

export const workspaceOutputSchema = z.discriminatedUnion("type", [
  summaryOutputSchema,
  notesOutputSchema,
  explanationOutputSchema,
  flashcardDeckOutputSchema,
  quizOutputSchema,
  timelineOutputSchema,
  comparisonOutputSchema,
  keyTermsOutputSchema,
]);

const generatedQuizOutputSchema = z.object({ title: requiredText, quizzes: quizCollectionSchema }).superRefine((output, context) => {
  const total = Object.values(output.quizzes).reduce((sum, questions) => sum + questions.length, 0);
  if (!total) context.addIssue({ code: "custom", path: ["quizzes"], message: "At least one quiz question is required" });
  output.quizzes.multipleChoice.forEach((question, index) => {
    if (!question.options.includes(question.correctAnswer)) {
      context.addIssue({ code: "custom", path: ["quizzes", "multipleChoice", index, "correctAnswer"], message: "Answer must match one option" });
    }
  });
});

const generatedComparisonOutputSchema = z.object({
  title: requiredText,
  subjects: z.array(requiredText).min(2).max(5),
  rows: z.array(comparisonRowSchema).min(1).max(20),
}).superRefine((output, context) => {
  output.rows.forEach((row, index) => {
    if (row.values.length !== output.subjects.length) {
      context.addIssue({ code: "custom", path: ["rows", index, "values"], message: "One value per subject is required" });
    }
  });
});

export const generatedOutputSchemas = {
  summary: z.object({ title: requiredText, text: requiredText }),
  notes: z.object({ title: requiredText, items: z.array(noteSchema).min(1).max(30) }),
  explanation: z.object({ title: requiredText, text: requiredText }),
  flashcards: z.object({ title: requiredText, cards: z.array(flashcardSchema).min(1).max(30) }),
  quiz: generatedQuizOutputSchema,
  timeline: z.object({ title: requiredText, events: z.array(timelineEventSchema).min(2).max(30) }),
  comparison: generatedComparisonOutputSchema,
  keyTerms: z.object({ title: requiredText, terms: z.array(keyTermSchema).min(1).max(40) }),
} as const;

export const outputKindSchema = z.enum([
  "summary",
  "notes",
  "explanation",
  "flashcards",
  "quiz",
  "timeline",
  "comparison",
  "keyTerms",
]);

export const workspacePromptSchema = z.object({
  id,
  text: requiredText,
  createdAt: timestamp,
  outputIds: z.array(id),
});

export const workspaceActivitySchema = z.object({
  id,
  type: z.enum(["workspaceCreated", "sourceAdded", "outputCreated", "quizCompleted"]),
  title: requiredText,
  createdAt: timestamp,
  outputId: id.nullable(),
});

export const flashcardRatingSchema = z.enum(["again", "hard", "good", "easy"]);
export const workspaceSectionSchema = z.enum(["overview", "sources", "outputs", "progress"]);
export const quizAttemptSchema = z.object({
  id,
  outputId: id.nullable(),
  type: z.enum(["multipleChoice", "trueFalse", "shortAnswer", "fillBlank"]),
  score: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  incorrectIds: z.array(id),
  completedAt: timestamp,
});

export const workspaceProgressSchema = z.object({
  flashcardRatings: z.record(z.string(), flashcardRatingSchema),
  conceptMastery: z.record(z.string(), z.number().min(0).max(100)),
  quizAttempts: z.array(quizAttemptSchema),
  lastSection: workspaceSectionSchema,
  activeOutputId: id.nullable(),
});

export const workspaceSchema = z.object({
  version: z.literal(2),
  id,
  title: requiredText,
  sourceLanguage: requiredText,
  createdAt: timestamp,
  updatedAt: timestamp,
  sources: z.array(workspaceSourceSchema).min(1),
  prompts: z.array(workspacePromptSchema),
  concepts: z.array(conceptSchema).min(1).max(50),
  outputs: z.array(workspaceOutputSchema),
  activity: z.array(workspaceActivitySchema),
  progress: workspaceProgressSchema,
});

export const workspaceStorageSchema = z.object({
  version: z.literal(2),
  workspaces: z.array(workspaceSchema),
});

export type Difficulty = z.infer<typeof difficultySchema>;
export type Concept = z.infer<typeof conceptSchema>;
export type Note = z.infer<typeof noteSchema>;
export type Flashcard = z.infer<typeof flashcardSchema>;
export type FlashcardRating = z.infer<typeof flashcardRatingSchema>;
export type MultipleChoiceQuestion = z.infer<typeof multipleChoiceQuestionSchema>;
export type QuizCollection = z.infer<typeof quizCollectionSchema>;
export type QuizAttempt = z.infer<typeof quizAttemptSchema>;
export type GeneratedWorkspace = z.infer<typeof generatedWorkspaceSchema>;
export type WorkspaceSource = z.infer<typeof workspaceSourceSchema>;
export type WorkspaceOutput = z.infer<typeof workspaceOutputSchema>;
export type OutputKind = z.infer<typeof outputKindSchema>;
export type WorkspaceActivity = z.infer<typeof workspaceActivitySchema>;
export type WorkspaceProgress = z.infer<typeof workspaceProgressSchema>;
export type WorkspaceSection = z.infer<typeof workspaceSectionSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
