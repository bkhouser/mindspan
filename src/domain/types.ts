export const TOPIC_SLUGS = [
  "science-nature",
  "history",
  "geography",
  "sports",
  "arts-literature",
  "film-television",
  "music",
  "lifestyle-culture",
] as const;

export type TopicSlug = (typeof TOPIC_SLUGS)[number];
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type UserRole = "user" | "sys_admin";
export type GroupRole = "member" | "admin";
export type PlayMode = "mixed" | "topic" | "pack";
export type QuestionStatus = "draft" | "review" | "published" | "retired";
export type MediaKind = "image" | "audio" | "video";
export type AssistanceKind = "show_choices";

export interface MediaDescriptor {
  kind: MediaKind;
  signedUrl: string;
  altText: string;
  transcriptAvailable: boolean;
}

export interface QuestionPresentation {
  id: string;
  prompt: string;
  topic: { id: string; slug: TopicSlug; name: string };
  difficulty: Difficulty;
  media: MediaDescriptor | null;
  timeLimitSeconds: number;
  scoringTimeLimitSeconds: number;
  startingPoints: number;
  expiresAt: string;
  mediaLoadDeadline: string | null;
}

export interface ChoiceReveal {
  choices: Array<{ id: string; text: string }>;
  assistance: AssistanceKind;
  pointFactor: number;
  revisedPointCeiling: number;
}

export interface AttemptResult {
  correct: boolean;
  canonicalAnswer: string;
  explanation: string;
  details: string;
  source: { label: string; url: string };
  earnedPoints: number;
  topicMastery: TopicMastery;
  subtopicMastery: Array<{
    id: string;
    name: string;
    proficiency: number;
    uniqueQuestions: number;
  }>;
  achievements: Array<{
    slug: string;
    name: string;
    description: string;
    insightAwarded: number;
  }>;
  insightBalance: number;
}

export interface TopicMastery {
  topicId: string;
  proficiency: number;
  rankScore: number | null;
  accuracy: number;
  assistedRate: number;
  weightedSuccesses: number;
  weightedEvidence: number;
  uniqueQuestions: number;
  tier: MasteryTier;
}

export type MasteryTier =
  "unrated" | "developing" | "proficient" | "expert" | "master";

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  masteryScore: number | null;
  uniqueQuestions: number;
  accuracy: number;
  lifetimePoints: number;
}
