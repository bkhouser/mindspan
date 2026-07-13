import { difficultyDistribution, shouldUseNovelPool, targetDifficulty } from "./scheduling";
import type { Difficulty } from "./types";

export interface CandidateQuestion {
  id: string;
  question_id: string;
  difficulty: Difficulty;
  userState?: { correct_count: number; last_correct: boolean | null; next_review_at: string | null; last_session_sequence: number | null };
}

function weightedPick<T>(items: Array<{ item: T; weight: number }>, random: number) {
  const total = items.reduce((sum, entry) => sum + entry.weight, 0);
  if (!items.length || total <= 0) return null;
  let cursor = random * total;
  for (const entry of items) { cursor -= entry.weight; if (cursor <= 0) return entry.item; }
  return items.at(-1)?.item ?? null;
}

export function selectQuestion(candidates: CandidateQuestion[], proficiency: number, sequence: number, random = Math.random()) {
  const now = Date.now();
  const novel = candidates.filter((candidate) => !candidate.userState);
  const review = candidates.filter((candidate) => {
    const state = candidate.userState;
    if (!state) return false;
    if (state.last_session_sequence != null && sequence - state.last_session_sequence <= 5 && state.last_correct === false) return false;
    return !state.next_review_at || new Date(state.next_review_at).getTime() <= now;
  });
  const useNovel = shouldUseNovelPool(random, novel.length > 0, review.length > 0);
  const pool = useNovel ? novel : review;
  const target = targetDifficulty(proficiency);
  const distribution = difficultyDistribution(target);
  return weightedPick(pool.map((candidate) => ({
    item: candidate,
    weight: (distribution.get(candidate.difficulty) ?? 0.05) * (candidate.userState?.last_correct ? 0.2 ** Math.max(1, candidate.userState.correct_count) : 1),
  })), (random * 997) % 1) ?? weightedPick(candidates.map((item) => ({ item, weight: 1 })), random);
}
