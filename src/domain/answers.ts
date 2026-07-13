export interface AnswerPolicy {
  removeLeadingArticles?: boolean;
  fuzzy?: boolean;
  rejectedAnswers?: string[];
}

const LEADING_ARTICLE = /^(a|an|the)\s+/i;
const NUMERIC_OR_DATE = /^[\d\s.,:/-]+$/;

export function normalizeAnswer(value: string, policy: AnswerPolicy = {}) {
  let normalized = value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (policy.removeLeadingArticles)
    normalized = normalized.replace(LEADING_ARTICLE, "");
  return normalized;
}

export function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length];
}

export function isAnswerAccepted(
  submitted: string,
  acceptedAnswers: string[],
  policy: AnswerPolicy = {},
) {
  const candidate = normalizeAnswer(submitted, policy);
  if (!candidate) return false;
  const normalizedAccepted = [
    ...new Set(
      acceptedAnswers
        .map((answer) => normalizeAnswer(answer, policy))
        .filter(Boolean),
    ),
  ];
  if (normalizedAccepted.includes(candidate)) return true;
  const normalizedRejected = new Set(
    (policy.rejectedAnswers ?? [])
      .map((answer) => normalizeAnswer(answer, policy))
      .filter(Boolean),
  );
  if (normalizedRejected.has(candidate)) return false;
  if (
    policy.fuzzy === false ||
    candidate.length < 5 ||
    NUMERIC_OR_DATE.test(candidate)
  )
    return false;

  const threshold = candidate.length >= 10 ? 2 : 1;
  const fuzzyMatches = normalizedAccepted.filter(
    (answer) =>
      answer.length >= 5 &&
      !NUMERIC_OR_DATE.test(answer) &&
      levenshtein(candidate, answer) <= threshold,
  );
  return fuzzyMatches.length === 1;
}
