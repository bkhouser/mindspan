export type QuestionChanges = {
  added: number;
  addedLabel?: string;
  revised: number;
  retired: number;
};

export function questionChangeTotal(changes: QuestionChanges) {
  return changes.added + changes.revised + changes.retired;
}

export function hasSignificantQuestionChanges(
  changes: QuestionChanges | undefined,
) {
  return Boolean(changes && questionChangeTotal(changes) >= 10);
}

export function questionChangesSummary(changes: QuestionChanges) {
  const parts = [
    changes.added
      ? `${changes.added.toLocaleString()} ${
          changes.addedLabel ??
          `new question${changes.added === 1 ? "" : "s"}`
        }`
      : null,
    changes.revised ? `${changes.revised.toLocaleString()} revised` : null,
    changes.retired ? `${changes.retired.toLocaleString()} retired` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}
