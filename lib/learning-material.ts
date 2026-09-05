import { z } from "zod";

const requiredText = z.string().trim().min(1);

export const flashcardSchema = z.object({
  id: requiredText,
  concept: requiredText,
  front: requiredText,
  back: requiredText,
});

export const quizQuestionSchema = z.object({
  id: requiredText,
  concept: requiredText,
  difficulty: z.enum(["foundation", "application", "challenge"]),
  question: requiredText,
  options: z.array(requiredText).length(4),
  correctOptionIndex: z.number().int().min(0).max(3),
  explanation: requiredText,
});

export const trueFalseQuestionSchema = z.object({
  id: requiredText,
  concept: requiredText,
  statement: requiredText,
  answer: z.boolean(),
  explanation: requiredText,
});

export const shortAnswerQuestionSchema = z.object({
  id: requiredText,
  concept: requiredText,
  question: requiredText,
  acceptedAnswers: z.array(requiredText).min(1).max(4),
  expectedAnswer: requiredText,
  explanation: requiredText,
});

export const studySetSchema = z.object({
  title: requiredText,
  summary: requiredText,
  bulletPoints: z.array(requiredText).min(6).max(12),
  flashcards: z.array(flashcardSchema).min(6).max(12),
  quizQuestions: z.array(quizQuestionSchema).min(5).max(10),
  trueFalseQuestions: z.array(trueFalseQuestionSchema).min(3).max(6),
  shortAnswerQuestions: z.array(shortAnswerQuestionSchema).min(3).max(6),
});

export type Flashcard = z.infer<typeof flashcardSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type TrueFalseQuestion = z.infer<typeof trueFalseQuestionSchema>;
export type ShortAnswerQuestion = z.infer<typeof shortAnswerQuestionSchema>;
export type StudySet = z.infer<typeof studySetSchema>;
export type ConceptMastery = Record<string, number>;

export const analysisResultSchema = studySetSchema;
export type AnalysisResult = StudySet;
