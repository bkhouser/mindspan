export interface AnswerPolicy {
  removeLeadingArticles?: boolean;
  fuzzy?: boolean;
  rejectedAnswers?: string[];
}

const LEADING_ARTICLE = /^(a|an|the)\s+/i;
const NUMERIC_OR_DATE = /^[\d\s.,:/-]+$/;
const SMALL_NUMBERS = new Map<string, number>([
  ["zero", 0],
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
  ["eleven", 11],
  ["twelve", 12],
  ["thirteen", 13],
  ["fourteen", 14],
  ["fifteen", 15],
  ["sixteen", 16],
  ["seventeen", 17],
  ["eighteen", 18],
  ["nineteen", 19],
]);
const TENS = new Map<string, number>([
  ["twenty", 20],
  ["thirty", 30],
  ["forty", 40],
  ["fifty", 50],
  ["sixty", 60],
  ["seventy", 70],
  ["eighty", 80],
  ["ninety", 90],
]);
const SCALES = new Map<string, bigint>([
  ["thousand", BigInt(1_000)],
  ["million", BigInt(1_000_000)],
  ["billion", BigInt(1_000_000_000)],
  ["trillion", BigInt(1_000_000_000_000)],
]);

function parseIntegerWords(tokens: string[]) {
  const words = tokens.filter((token) => token !== "and");
  if (!words.length) return null;
  let total = BigInt(0);
  let group = BigInt(0);
  let previous: "start" | "unit" | "teen" | "tens" | "hundred" | "scale" =
    "start";
  let previousScale = BigInt(1_000_000_000_000_000);

  for (const word of words) {
    const small = SMALL_NUMBERS.get(word);
    if (small !== undefined) {
      if (small < 10) {
        if (previous === "unit" || previous === "teen") return null;
        if (small === 0 && words.length > 1) return null;
        group += BigInt(small);
        previous = "unit";
      } else {
        if (["unit", "teen", "tens"].includes(previous)) return null;
        group += BigInt(small);
        previous = "teen";
      }
      continue;
    }

    const tens = TENS.get(word);
    if (tens !== undefined) {
      if (["unit", "teen", "tens"].includes(previous)) return null;
      group += BigInt(tens);
      previous = "tens";
      continue;
    }

    if (word === "hundred") {
      if (
        previous !== "unit" ||
        group < BigInt(1) ||
        group > BigInt(9)
      )
        return null;
      group *= BigInt(100);
      previous = "hundred";
      continue;
    }

    const scale = SCALES.get(word);
    if (!scale || group === BigInt(0) || scale >= previousScale) return null;
    total += group * scale;
    group = BigInt(0);
    previousScale = scale;
    previous = "scale";
  }

  if (previous === "scale") return null;
  return total + group;
}

function canonicalNumericLiteral(value: string) {
  const match = value.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  const sign = match[1] === "-" ? "-" : "";
  const integer = BigInt(match[2]).toString();
  const fraction = match[3]?.replace(/0+$/, "") ?? "";
  const magnitude = fraction ? `${integer}.${fraction}` : integer;
  return magnitude === "0" ? "0" : `${sign}${magnitude}`;
}

export function numberAnswerKey(value: string) {
  const prepared = value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .trim();
  const literal = canonicalNumericLiteral(prepared.replaceAll(",", ""));
  if (literal !== null) return literal;

  const tokens = prepared
    .replaceAll("-", " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");
  if (!tokens[0]) return null;
  const negative = tokens[0] === "minus" || tokens[0] === "negative";
  const unsigned = negative ? tokens.slice(1) : tokens;
  const pointAt = unsigned.indexOf("point");
  if (pointAt !== unsigned.lastIndexOf("point")) return null;
  const integerTokens = pointAt < 0 ? unsigned : unsigned.slice(0, pointAt);
  const integer = parseIntegerWords(integerTokens);
  if (integer === null) return null;

  let magnitude = integer.toString();
  if (pointAt >= 0) {
    const fractionTokens = unsigned.slice(pointAt + 1);
    if (!fractionTokens.length) return null;
    const digits = fractionTokens.map((token) => SMALL_NUMBERS.get(token));
    if (digits.some((digit) => digit === undefined || digit > 9)) return null;
    const fraction = digits.join("").replace(/0+$/, "");
    if (fraction) magnitude += `.${fraction}`;
  }
  return negative && magnitude !== "0" ? `-${magnitude}` : magnitude;
}

export function answersAreEquivalent(
  left: string,
  right: string,
  policy: AnswerPolicy = {},
) {
  if (normalizeAnswer(left, policy) === normalizeAnswer(right, policy))
    return true;
  const leftNumber = numberAnswerKey(left);
  return leftNumber !== null && leftNumber === numberAnswerKey(right);
}

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
  const candidateNumber = numberAnswerKey(submitted);
  if (
    candidateNumber !== null &&
    acceptedAnswers.some(
      (answer) => numberAnswerKey(answer) === candidateNumber,
    )
  )
    return true;
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
