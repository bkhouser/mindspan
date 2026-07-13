export interface PackQuestionLink {
  pack_id: string;
  question_id: string;
}

export interface QuestionProgressState {
  attempt_count: number;
  correct_count: number;
  question_id: string;
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
  states: QuestionProgressState[],
) {
  const questionsByPack = new Map<string, Set<string>>();
  const stateByQuestion = new Map(
    states.map((state) => [state.question_id, state]),
  );

  for (const link of links) {
    const questions = questionsByPack.get(link.pack_id) ?? new Set<string>();
    questions.add(link.question_id);
    questionsByPack.set(link.pack_id, questions);
  }

  return new Map(
    [...questionsByPack].map(([packId, questions]) => {
      let answered = 0;
      let correct = 0;
      for (const questionId of questions) {
        const state = stateByQuestion.get(questionId);
        if ((state?.attempt_count ?? 0) > 0) answered += 1;
        if ((state?.correct_count ?? 0) > 0) correct += 1;
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
