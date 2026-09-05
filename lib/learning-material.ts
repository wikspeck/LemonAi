import { z } from "zod";

export const analysisResultSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  bulletPoints: z.array(z.string().min(1)).min(5).max(10),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
