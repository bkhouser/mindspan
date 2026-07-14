import { z } from "zod";

export const questionImportSchema = z.object({
  catalogKey: z.string().trim().min(3).max(160).optional(),
  topicSlug: z.string().min(1),
  packSlugs: z.array(z.string()).min(1),
  subtopics: z.array(z.string().trim().min(2).max(80)).max(8).default([]),
  prompt: z.string().min(5).max(1000),
  answerMode: z.enum(["recall", "required_choice"]).default("recall"),
  canonicalAnswer: z.string().min(1).max(300),
  aliases: z.array(z.string().min(1)).default([]),
  distractors: z.array(z.string().min(1)).length(3),
  explanation: z.string().min(10).max(1000),
  details: z.string().min(10).max(4000),
  difficulty: z.number().int().min(1).max(5),
  timeLimitSeconds: z.number().int().min(15).max(90).default(30),
  removeLeadingArticles: z.boolean().default(false),
  source: z.object({
    label: z.string().min(1),
    url: z.string().url().startsWith("https://"),
  }),
  expiresAt: z.string().datetime().nullable().default(null),
});

export const questionBatchSchema = z
  .array(questionImportSchema)
  .min(1)
  .max(500);
