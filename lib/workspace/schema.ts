import { z } from "zod";

const requiredText = z.string().trim().min(1);
const id = z.string().trim().min(1);

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

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const detailLevelSchema = z.enum(["short", "balanced", "detailed"]);

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
  quizzes: z.object({
    multipleChoice: z.array(multipleChoiceQuestionSchema).max(20),
    trueFalse: z.array(trueFalseQuestionSchema).max(20),
    shortAnswer: z.array(shortAnswerQuestionSchema).max(20),
    fillBlank: z.array(fillBlankQuestionSchema).max(20),
  }),
});

export const studyWorkspaceSchema = generatedWorkspaceSchema.extend({
  id,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sourceText: requiredText,
  request: intentSchema.extend({ originalPrompt: z.string() }),
});

export const flashcardRatingSchema = z.enum(["again", "hard", "good", "easy"]);
export const workspaceModeSchema = z.enum(["overview", "notes", "flashcards", "quiz", "learn"]);

export const quizAttemptSchema = z.object({
  id,
  type: z.enum(["multipleChoice", "trueFalse", "shortAnswer", "fillBlank"]),
  score: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  incorrectIds: z.array(id),
  completedAt: z.string().datetime(),
});

export const workspaceProgressSchema = z.object({
  flashcardRatings: z.record(z.string(), flashcardRatingSchema),
  conceptMastery: z.record(z.string(), z.number().min(0).max(100)),
  quizAttempts: z.array(quizAttemptSchema),
  lastMode: workspaceModeSchema,
  noteEnhancements: z.record(z.string(), z.object({
    simplerExplanation: z.string().nullable(),
  })).default({}),
});

export const storedWorkspaceSchema = z.object({
  workspace: studyWorkspaceSchema,
  progress: workspaceProgressSchema,
});

export const workspaceActionSchema = z.enum(["explainSimpler", "makeFlashcard", "testMe"]);
export const workspaceActionResultSchema = z.object({
  action: workspaceActionSchema,
  explanation: z.string().nullable(),
  flashcard: flashcardSchema.nullable(),
  question: multipleChoiceQuestionSchema.nullable(),
});

export type StudyModule = z.infer<typeof studyModuleSchema>;
export type Concept = z.infer<typeof conceptSchema>;
export type Note = z.infer<typeof noteSchema>;
export type Flashcard = z.infer<typeof flashcardSchema>;
export type MultipleChoiceQuestion = z.infer<typeof multipleChoiceQuestionSchema>;
export type TrueFalseQuestion = z.infer<typeof trueFalseQuestionSchema>;
export type ShortAnswerQuestion = z.infer<typeof shortAnswerQuestionSchema>;
export type FillBlankQuestion = z.infer<typeof fillBlankQuestionSchema>;
export type GeneratedWorkspace = z.infer<typeof generatedWorkspaceSchema>;
export type StudyWorkspace = z.infer<typeof studyWorkspaceSchema>;
export type FlashcardRating = z.infer<typeof flashcardRatingSchema>;
export type WorkspaceMode = z.infer<typeof workspaceModeSchema>;
export type WorkspaceProgress = z.infer<typeof workspaceProgressSchema>;
export type StoredWorkspace = z.infer<typeof storedWorkspaceSchema>;
export type WorkspaceAction = z.infer<typeof workspaceActionSchema>;
export type WorkspaceActionResult = z.infer<typeof workspaceActionResultSchema>;
