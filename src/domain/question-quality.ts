export function isQuestionQualityActionable(
  verdict: string | null | undefined,
  hasUnresolvedPlayerFlag: boolean,
) {
  return (
    verdict === "needs_revision" ||
    verdict === "rejected" ||
    hasUnresolvedPlayerFlag
  );
}
