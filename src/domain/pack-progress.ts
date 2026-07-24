export interface PackQuestionLink {
  pack_id: string;
  question_id: string;
}

export interface PackQuestionAttempt {
  correct: boolean;
  created_at: string;
  question_id: string;
}

export interface PackUnlock {
  pack_id: string;
  unlocked_at: string;
}

export interface PackProgress {
  answered: number;
  correct: number;
  total: number;
}

export interface QuestionDifficulty {
  difficulty: number;
  question_id: string;
}

export function calculatePackProgress(
  links: PackQuestionLink[],
  attempts: PackQuestionAttempt[],
  unlocks?: PackUnlock[],
) {
  const questionsByPack = new Map<string, Set<string>>();
  const attemptsByQuestion = new Map<string, PackQuestionAttempt[]>();
  const unlockedAtByPack = new Map(
    unlocks?.map((unlock) => [unlock.pack_id, Date.parse(unlock.unlocked_at)]),
  );

  for (const attempt of attempts) {
    const questionAttempts = attemptsByQuestion.get(attempt.question_id) ?? [];
    questionAttempts.push(attempt);
    attemptsByQuestion.set(attempt.question_id, questionAttempts);
  }

  for (const link of links) {
    const questions = questionsByPack.get(link.pack_id) ?? new Set<string>();
    questions.add(link.question_id);
    questionsByPack.set(link.pack_id, questions);
  }

  return new Map(
    [...questionsByPack].map(([packId, questions]) => {
      let answered = 0;
      let correct = 0;
      const unlockedAt = unlockedAtByPack.get(packId) ?? -Infinity;
      for (const questionId of questions) {
        const eligibleAttempts = (
          attemptsByQuestion.get(questionId) ?? []
        ).filter((attempt) => Date.parse(attempt.created_at) >= unlockedAt);
        if (eligibleAttempts.length > 0) answered += 1;
        if (eligibleAttempts.some((attempt) => attempt.correct)) correct += 1;
      }
      return [packId, { answered, correct, total: questions.size }];
    }),
  );
}

export function calculatePackAverageDifficulty(
  links: PackQuestionLink[],
  questions: QuestionDifficulty[],
) {
  const questionsByPack = new Map<string, Set<string>>();
  const difficultyByQuestion = new Map(
    questions.map((question) => [question.question_id, question.difficulty]),
  );

  for (const link of links) {
    if (!difficultyByQuestion.has(link.question_id)) continue;
    const packQuestions =
      questionsByPack.get(link.pack_id) ?? new Set<string>();
    packQuestions.add(link.question_id);
    questionsByPack.set(link.pack_id, packQuestions);
  }

  return new Map(
    [...questionsByPack].map(([packId, questionIds]) => {
      const totalDifficulty = [...questionIds].reduce(
        (sum, questionId) => sum + (difficultyByQuestion.get(questionId) ?? 0),
        0,
      );
      return [packId, totalDifficulty / questionIds.size];
    }),
  );
}
