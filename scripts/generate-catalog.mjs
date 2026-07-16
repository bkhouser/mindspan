import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const outputDirectory = resolve(
  import.meta.dirname,
  "..",
  "content",
  "catalog",
  "questions",
);
mkdirSync(outputDirectory, { recursive: true });
const cacheDirectory = resolve(outputDirectory, "..", "cache");
mkdirSync(cacheDirectory, { recursive: true });

const labelService = `
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
  }
`;

const numberWords = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

function slug(value) {
  return value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "")
    .slice(0, 80);
}

function normalize(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^\p{L}\p{N}]+/gu, "");
}

function aliases(answer) {
  const result = [];
  if (/^\d+$/.test(answer)) {
    const value = Number(answer);
    if (value >= 0 && value <= 20) result.push(numberWords[value]);
  }
  const ascii = answer.normalize("NFKD").replaceAll(/[\u0300-\u036f]/g, "");
  if (ascii !== answer) result.push(ascii);
  return [...new Set(result)];
}

function answerText(row) {
  const value = row.answerLabel?.value ?? row.answer?.value;
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return null;
  if (/^Q\d+$/.test(value)) return null;
  if (/^-?\d+(?:\.0+)?$/.test(value)) return String(Number(value));
  return value.trim();
}

function difficultySequence(distribution) {
  return distribution.flatMap((count, index) =>
    Array.from({ length: count }, () => index + 1),
  );
}

async function wikidata(query, attempt = 1) {
  const cachePath = resolve(
    cacheDirectory,
    `${createHash("sha1").update(query).digest("hex")}.json`,
  );
  if (existsSync(cachePath)) return JSON.parse(readFileSync(cachePath, "utf8"));
  let response;
  try {
    response = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: {
        accept: "application/sparql-results+json",
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "user-agent": "MindspanCatalog/0.1 (private trivia beta)",
      },
      body: new URLSearchParams({ query }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    if (attempt < 4) {
      await new Promise((resolvePromise) =>
        setTimeout(resolvePromise, 1_500 * attempt),
      );
      return wikidata(query, attempt + 1);
    }
    throw error;
  }
  if (!response.ok) {
    if (attempt < 4) {
      await new Promise((resolvePromise) =>
        setTimeout(resolvePromise, 1_500 * attempt),
      );
      return wikidata(query, attempt + 1);
    }
    throw new Error(
      `Wikidata returned ${response.status}: ${await response.text()}`,
    );
  }
  const bindings = (await response.json()).results.bindings;
  writeFileSync(cachePath, JSON.stringify(bindings));
  return bindings;
}

const rowCache = new Map();

async function rowsFor(spec) {
  if (rowCache.has(spec.where)) return rowCache.get(spec.where);
  const query = `
    SELECT DISTINCT ?subject ?subjectLabel ?answer ?answerLabel ?sitelinks WHERE {
      ${spec.where}
      ?subject wikibase:sitelinks ?sitelinks.
      FILTER(?sitelinks >= 5)
      ${labelService}
    }
    LIMIT 150
  `;
  const rows = await wikidata(query);
  const seenSubjects = new Set();
  const filtered = rows.filter((row) => {
    const subject = row.subjectLabel?.value;
    const answer = answerText(row);
    if (!subject || /^Q\d+$/.test(subject) || !answer || subject === answer)
      return false;
    const subjectKey = row.subject?.value ?? subject;
    if (seenSubjects.has(subjectKey)) return false;
    const answerKey = normalize(answer);
    if (!answerKey) return false;
    seenSubjects.add(subjectKey);
    return true;
  });
  rowCache.set(spec.where, filtered);
  return filtered;
}

function makeQuestion(pack, spec, row, answerPool, index) {
  const subject = row.subjectLabel.value.trim();
  const answer = answerText(row);
  const answerKey = normalize(answer);
  const distractors = [];
  for (let offset = 1; distractors.length < 3; offset += 1) {
    const candidate = answerPool[(index + offset) % answerPool.length];
    if (
      normalize(candidate) !== answerKey &&
      !distractors.some((item) => normalize(item) === normalize(candidate))
    )
      distractors.push(candidate);
    if (offset > answerPool.length * 2)
      throw new Error(`Not enough distractors for ${pack.slug}/${spec.id}`);
  }
  return {
    catalogKey: `${pack.slug}.${spec.id}.${slug(subject)}`,
    topicSlug: spec.topic,
    packSlugs: [pack.slug],
    subtopics: [spec.subtopic],
    prompt: spec.prompt(subject),
    canonicalAnswer: answer,
    aliases: aliases(answer),
    distractors,
    explanation: spec.explanation(subject, answer),
    details: spec.details(subject, answer),
    difficulty: 1,
    timeLimitSeconds: answer.length > 28 ? 45 : 30,
    removeLeadingArticles: true,
    source: {
      label: "Wikidata",
      url: row.subject.value.replace(/^http:\/\//, "https://"),
    },
    expiresAt: null,
  };
}

function relation({
  id,
  topic,
  subtopic,
  count,
  where,
  prompt,
  explanation,
  details,
  fallbackAnswers = [],
}) {
  return {
    id,
    topic,
    subtopic,
    count,
    where,
    prompt,
    explanation,
    details,
    fallbackAnswers,
  };
}

const specs = {
  elementSymbol: (count, reverse = false) =>
    relation({
      id: reverse ? "element-by-symbol" : "element-symbol",
      topic: "science-nature",
      subtopic: "Chemistry",
      count,
      where: "?subject wdt:P31 wd:Q11344; wdt:P246 ?answer.",
      prompt: reverse
        ? (subject) =>
            `Which chemical element is represented by the symbol shown for ${subject}?`
        : (subject) => `What is the chemical symbol for ${subject}?`,
      explanation: (subject, answer) =>
        `${answer} is the standard chemical symbol for ${subject}.`,
      details: (subject, answer) =>
        `Periodic-table symbols provide a universal shorthand for elements; ${subject} is represented by ${answer}.`,
    }),
  elementNumber: (count, reverse = false) =>
    relation({
      id: reverse ? "element-by-number" : "element-number",
      topic: "science-nature",
      subtopic: "Chemistry",
      count,
      where: "?subject wdt:P31 wd:Q11344; wdt:P1086 ?answer.",
      prompt: reverse
        ? (subject) => `Which atomic number belongs to ${subject}?`
        : (subject) => `What is the atomic number of ${subject}?`,
      explanation: (subject, answer) =>
        `${subject} has atomic number ${answer}.`,
      details: (subject, answer) =>
        `Atomic number counts the protons in an atom's nucleus; every ${subject} atom has ${answer}.`,
    }),
  moonParent: (count) =>
    relation({
      id: "moon-parent",
      topic: "science-nature",
      subtopic: "Astronomy",
      count,
      where:
        "?subject wdt:P31/wdt:P279* wd:Q2537; wdt:P397 ?answer. FILTER NOT EXISTS { ?subject wdt:P397 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Which astronomical body does ${subject} orbit?`,
      explanation: (subject, answer) =>
        `${subject} is a satellite of ${answer}.`,
      details: (subject, answer) =>
        `${subject} is gravitationally bound to ${answer} and travels around it in orbit.`,
      fallbackAnswers: [
        "Earth",
        "Mars",
        "Jupiter",
        "Saturn",
        "Uranus",
        "Neptune",
        "Pluto",
      ],
    }),
  scientistField: (count) =>
    relation({
      id: "scientist-field",
      topic: "science-nature",
      subtopic: "Scientists",
      count,
      where:
        "?subject wdt:P106 wd:Q901; wdt:P101 ?answer. FILTER NOT EXISTS { ?subject wdt:P101 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) =>
        `Which scientific field is most closely associated with ${subject}?`,
      explanation: (subject, answer) =>
        `${subject} worked primarily in ${answer}.`,
      details: (subject, answer) =>
        `${answer} is recorded as the principal field of work associated with ${subject}.`,
    }),
  animalParent: (count) =>
    relation({
      id: "animal-taxonomy",
      topic: "science-nature",
      subtopic: "Biology",
      count,
      where:
        "?subject wdt:P31 wd:Q16521; wdt:P171 ?answer. FILTER NOT EXISTS { ?subject wdt:P171 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Which broader taxon directly contains ${subject}?`,
      explanation: (subject, answer) =>
        `${subject} is classified within ${answer}.`,
      details: (subject, answer) =>
        `Biological taxonomy arranges organisms in nested groups; the recorded parent taxon of ${subject} is ${answer}.`,
    }),
  constellationAbbreviation: (count) =>
    relation({
      id: "constellation-abbreviation",
      topic: "science-nature",
      subtopic: "Astronomy",
      count,
      where: "?subject wdt:P31 wd:Q8928; wdt:P1813 ?answer.",
      prompt: (subject) =>
        `What is the standard three-letter abbreviation for the constellation ${subject}?`,
      explanation: (subject, answer) =>
        `${answer} is the standard abbreviation for ${subject}.`,
      details: (subject, answer) =>
        `Astronomers use standardized abbreviations in star names and charts; ${subject} is abbreviated ${answer}.`,
    }),
  diseaseSpecialty: (count) =>
    relation({
      id: "disease-specialty",
      topic: "science-nature",
      subtopic: "Medicine",
      count,
      where:
        "?subject wdt:P31 wd:Q12136; wdt:P1995 ?answer. FILTER NOT EXISTS { ?subject wdt:P1995 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) =>
        `Which medical specialty most directly treats ${subject}?`,
      explanation: (subject, answer) =>
        `${answer} is the specialty associated with ${subject}.`,
      details: (subject, answer) =>
        `Medical specialties organize care by body system or disease group; ${subject} is associated with ${answer}.`,
    }),
  eventYear: (count, id = "event-year", subtopic = "World Events") =>
    relation({
      id,
      topic: "history",
      subtopic,
      count,
      where:
        "?subject wdt:P31/wdt:P279* wd:Q13418847; wdt:P585 ?date. BIND(STR(YEAR(?date)) AS ?answer)",
      prompt: (subject) => `In what year did ${subject} occur?`,
      explanation: (subject, answer) => `${subject} occurred in ${answer}.`,
      details: (subject, answer) =>
        `${answer} places ${subject} in its chronological historical context.`,
    }),
  battleLocation: (count) =>
    relation({
      id: "battle-location",
      topic: "history",
      subtopic: "Military History",
      count,
      where:
        "?subject wdt:P31 wd:Q178561; wdt:P276 ?answer. FILTER NOT EXISTS { ?subject wdt:P276 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Where was the ${subject} fought?`,
      explanation: (subject, answer) =>
        `The ${subject} took place at ${answer}.`,
      details: (subject, answer) =>
        `${answer} is the recorded location of the ${subject}.`,
    }),
  treatyYear: (count) =>
    relation({
      id: "treaty-year",
      topic: "history",
      subtopic: "Diplomatic History",
      count,
      where:
        "?subject wdt:P31 wd:Q131569; wdt:P577 ?date. BIND(STR(YEAR(?date)) AS ?answer)",
      prompt: (subject) =>
        `In what year was ${subject} concluded or published?`,
      explanation: (subject, answer) => `${subject} dates to ${answer}.`,
      details: (subject, answer) =>
        `The date ${answer} identifies the historical setting in which ${subject} was concluded.`,
    }),
  empireCapital: (count) =>
    relation({
      id: "empire-capital",
      topic: "history",
      subtopic: "Empires & Civilizations",
      count,
      where:
        "VALUES ?kind { wd:Q48349 wd:Q3024240 } ?subject wdt:P31 ?kind; wdt:P36 ?answer. FILTER NOT EXISTS { ?subject wdt:P36 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `What was the capital of ${subject}?`,
      explanation: (subject, answer) =>
        `${answer} served as the capital of ${subject}.`,
      details: (subject, answer) =>
        `${answer} was the principal political center recorded for ${subject}.`,
    }),
  monarchCountry: (count) =>
    relation({
      id: "monarch-country",
      topic: "history",
      subtopic: "Royal History",
      count,
      where:
        "?subject wdt:P106 wd:Q116; wdt:P27 ?answer. FILTER NOT EXISTS { ?subject wdt:P27 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) =>
        `Which country is monarch ${subject} associated with?`,
      explanation: (subject, answer) =>
        `${subject} is associated with ${answer}.`,
      details: (subject, answer) =>
        `${answer} is the recorded country connected with the reign or citizenship of ${subject}.`,
    }),
  countryCapital: (count, reverse = false) =>
    relation({
      id: reverse ? "country-by-capital" : "country-capital",
      topic: "geography",
      subtopic: "Countries & Capitals",
      count,
      where:
        "?subject wdt:P31 wd:Q3624078; wdt:P36 ?answer. FILTER NOT EXISTS { ?subject wdt:P36 ?other. FILTER(?other != ?answer) }",
      prompt: reverse
        ? (subject) =>
            `The capital shown for ${subject} belongs to which country?`
        : (subject) => `What is the capital of ${subject}?`,
      explanation: (subject, answer) =>
        `${answer} is the capital of ${subject}.`,
      details: (subject, answer) =>
        `${answer} serves as the national capital and a principal seat of government for ${subject}.`,
    }),
  countryContinent: (count) =>
    relation({
      id: "country-continent",
      topic: "geography",
      subtopic: "World Regions",
      count,
      where:
        "?subject wdt:P31 wd:Q3624078; wdt:P30 ?answer. FILTER NOT EXISTS { ?subject wdt:P30 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `On which continent is ${subject} located?`,
      explanation: (subject, answer) => `${subject} is located in ${answer}.`,
      details: (subject, answer) =>
        `${answer} is the continent used to geographically classify ${subject}.`,
    }),
  riverMouth: (count) =>
    relation({
      id: "river-mouth",
      topic: "geography",
      subtopic: "Rivers",
      count,
      where:
        "?subject wdt:P31 wd:Q4022; wdt:P403 ?answer. FILTER NOT EXISTS { ?subject wdt:P403 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Into what body of water does the ${subject} flow?`,
      explanation: (subject, answer) =>
        `The ${subject} empties into ${answer}.`,
      details: (subject, answer) =>
        `${answer} is recorded as the terminal water body or mouth of the ${subject}.`,
      fallbackAnswers: [
        "Atlantic Ocean",
        "Pacific Ocean",
        "Indian Ocean",
        "Mediterranean Sea",
        "North Sea",
        "Black Sea",
        "Gulf of Mexico",
      ],
    }),
  mountainCountry: (count) =>
    relation({
      id: "mountain-country",
      topic: "geography",
      subtopic: "Mountains",
      count,
      where:
        "?subject wdt:P31 wd:Q8502; wdt:P17 ?answer. FILTER NOT EXISTS { ?subject wdt:P17 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `In which country is ${subject} located?`,
      explanation: (subject, answer) => `${subject} is located in ${answer}.`,
      details: (subject, answer) =>
        `${answer} is the country recorded for the location of ${subject}.`,
    }),
  landmarkCountry: (count) =>
    relation({
      id: "landmark-country",
      topic: "geography",
      subtopic: "Landmarks",
      count,
      where:
        "?subject wdt:P31 wd:Q2319498; wdt:P17 ?answer. FILTER NOT EXISTS { ?subject wdt:P17 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Which country contains the landmark ${subject}?`,
      explanation: (subject, answer) => `${subject} is in ${answer}.`,
      details: (subject, answer) =>
        `${answer} is the country associated with the location of ${subject}.`,
    }),
  athleteSport: (count) =>
    relation({
      id: "athlete-sport",
      topic: "sports",
      subtopic: "Athletes",
      count,
      where:
        "?subject wdt:P106 wd:Q2066131; wdt:P641 ?answer. FILTER NOT EXISTS { ?subject wdt:P641 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `In which sport did ${subject} compete?`,
      explanation: (subject, answer) => `${subject} competed in ${answer}.`,
      details: (subject, answer) =>
        `${answer} is the sport principally associated with athlete ${subject}.`,
    }),
  athleteCountry: (count) =>
    relation({
      id: "athlete-country",
      topic: "sports",
      subtopic: "International Sports",
      count,
      where:
        "?subject wdt:P106 wd:Q2066131; wdt:P27 ?answer. FILTER NOT EXISTS { ?subject wdt:P27 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) =>
        `Which country did athlete ${subject} represent or hold citizenship in?`,
      explanation: (subject, answer) =>
        `${subject} is associated with ${answer}.`,
      details: (subject, answer) =>
        `${answer} is the country recorded for athlete ${subject}.`,
    }),
  teamSport: (count) =>
    relation({
      id: "team-sport",
      topic: "sports",
      subtopic: "Teams",
      count,
      where:
        "?subject wdt:P31 wd:Q12973014; wdt:P641 ?answer. FILTER NOT EXISTS { ?subject wdt:P641 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Which sport does ${subject} play?`,
      explanation: (subject, answer) => `${subject} competes in ${answer}.`,
      details: (subject, answer) =>
        `${answer} is the sport associated with the team ${subject}.`,
    }),
  teamVenue: (count) =>
    relation({
      id: "team-venue",
      topic: "sports",
      subtopic: "Stadiums & Arenas",
      count,
      where:
        "?subject wdt:P31 wd:Q12973014; wdt:P115 ?answer. FILTER NOT EXISTS { ?subject wdt:P115 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `What is the home venue of ${subject}?`,
      explanation: (subject, answer) =>
        `${subject} plays home events at ${answer}.`,
      details: (subject, answer) =>
        `${answer} is recorded as the principal home venue of ${subject}.`,
    }),
  competitionSport: (count) =>
    relation({
      id: "competition-sport",
      topic: "sports",
      subtopic: "Competitions",
      count,
      where:
        "?subject wdt:P31 wd:Q13406554; wdt:P641 ?answer. FILTER NOT EXISTS { ?subject wdt:P641 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Which sport is contested in ${subject}?`,
      explanation: (subject, answer) =>
        `${subject} is a competition in ${answer}.`,
      details: (subject, answer) =>
        `${answer} is the sporting discipline associated with ${subject}.`,
    }),
  paintingArtist: (count) =>
    relation({
      id: "painting-artist",
      topic: "arts-literature",
      subtopic: "Painting",
      count,
      where:
        "?subject wdt:P31 wd:Q3305213; wdt:P170 ?answer. FILTER NOT EXISTS { ?subject wdt:P170 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Who created the painting ${subject}?`,
      explanation: (subject, answer) => `${answer} created ${subject}.`,
      details: (subject, answer) =>
        `${subject} is recorded as a work by ${answer}.`,
    }),
  bookAuthor: (count) =>
    relation({
      id: "book-author",
      topic: "arts-literature",
      subtopic: "Literature",
      count,
      where:
        "?subject wdt:P31 wd:Q571; wdt:P50 ?answer. FILTER NOT EXISTS { ?subject wdt:P50 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Who wrote ${subject}?`,
      explanation: (subject, answer) => `${answer} wrote ${subject}.`,
      details: (subject, answer) =>
        `${subject} is attributed to author ${answer}.`,
    }),
  sculptureArtist: (count) =>
    relation({
      id: "sculpture-artist",
      topic: "arts-literature",
      subtopic: "Sculpture",
      count,
      where:
        "?subject wdt:P31 wd:Q860861; wdt:P170 ?answer. FILTER NOT EXISTS { ?subject wdt:P170 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Which artist created the sculpture ${subject}?`,
      explanation: (subject, answer) => `${answer} created ${subject}.`,
      details: (subject, answer) =>
        `${subject} is a sculptural work attributed to ${answer}.`,
    }),
  buildingArchitect: (count) =>
    relation({
      id: "building-architect",
      topic: "arts-literature",
      subtopic: "Architecture",
      count,
      where:
        "?subject wdt:P31 wd:Q41176; wdt:P84 ?answer. FILTER NOT EXISTS { ?subject wdt:P84 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Which architect designed ${subject}?`,
      explanation: (subject, answer) => `${answer} designed ${subject}.`,
      details: (subject, answer) =>
        `${subject} is an architectural work credited to ${answer}.`,
    }),
  bookYear: (count) =>
    relation({
      id: "book-year",
      topic: "arts-literature",
      subtopic: "Literary History",
      count,
      where:
        "?subject wdt:P31 wd:Q571; wdt:P577 ?date. BIND(STR(YEAR(?date)) AS ?answer)",
      prompt: (subject) => `In what year was ${subject} first published?`,
      explanation: (subject, answer) =>
        `${subject} was first published in ${answer}.`,
      details: (subject, answer) =>
        `${answer} places the publication of ${subject} in literary history.`,
    }),
  filmDirector: (count) =>
    relation({
      id: "film-director",
      topic: "film-television",
      subtopic: "Film Directors",
      count,
      where:
        "?subject wdt:P31 wd:Q11424; wdt:P57 ?answer. FILTER NOT EXISTS { ?subject wdt:P57 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Who directed the film ${subject}?`,
      explanation: (subject, answer) => `${answer} directed ${subject}.`,
      details: (subject, answer) =>
        `${subject} lists ${answer} as its director.`,
    }),
  filmYear: (count) =>
    relation({
      id: "film-year",
      topic: "film-television",
      subtopic: "Film History",
      count,
      where:
        "?subject wdt:P31 wd:Q11424; wdt:P577 ?date. BIND(STR(YEAR(?date)) AS ?answer)",
      prompt: (subject) =>
        `In what year was the film ${subject} first released?`,
      explanation: (subject, answer) =>
        `${subject} was first released in ${answer}.`,
      details: (subject, answer) =>
        `${answer} is the recorded initial release year for ${subject}.`,
    }),
  filmCountry: (count) =>
    relation({
      id: "film-country",
      topic: "film-television",
      subtopic: "World Cinema",
      count,
      where:
        "?subject wdt:P31 wd:Q11424; wdt:P495 ?answer. FILTER NOT EXISTS { ?subject wdt:P495 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Which country produced the film ${subject}?`,
      explanation: (subject, answer) => `${subject} is a film from ${answer}.`,
      details: (subject, answer) =>
        `${answer} is recorded as the country of origin for ${subject}.`,
    }),
  televisionCreator: (count) =>
    relation({
      id: "television-creator",
      topic: "film-television",
      subtopic: "Television",
      count,
      where:
        "?subject wdt:P31 wd:Q5398426; wdt:P170 ?answer. FILTER NOT EXISTS { ?subject wdt:P170 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Who created the television series ${subject}?`,
      explanation: (subject, answer) => `${answer} created ${subject}.`,
      details: (subject, answer) =>
        `${subject} credits ${answer} as its creator.`,
    }),
  filmComposer: (count) =>
    relation({
      id: "film-composer",
      topic: "film-television",
      subtopic: "Screen Music",
      count,
      where:
        "?subject wdt:P31 wd:Q11424; wdt:P86 ?answer. FILTER NOT EXISTS { ?subject wdt:P86 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Who composed the music for the film ${subject}?`,
      explanation: (subject, answer) =>
        `${answer} composed the music for ${subject}.`,
      details: (subject, answer) =>
        `${subject} credits ${answer} for its musical score.`,
    }),
  songPerformer: (count) =>
    relation({
      id: "song-performer",
      topic: "music",
      subtopic: "Songs",
      count,
      where:
        "?subject wdt:P31 wd:Q7366; wdt:P175 ?answer. FILTER NOT EXISTS { ?subject wdt:P175 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Which artist performed ${subject}?`,
      explanation: (subject, answer) => `${answer} performed ${subject}.`,
      details: (subject, answer) =>
        `${subject} is recorded as a performance by ${answer}.`,
    }),
  albumArtist: (count) =>
    relation({
      id: "album-artist",
      topic: "music",
      subtopic: "Albums",
      count,
      where:
        "?subject wdt:P31 wd:Q482994; wdt:P175 ?answer. FILTER NOT EXISTS { ?subject wdt:P175 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Which artist released the album ${subject}?`,
      explanation: (subject, answer) => `${answer} released ${subject}.`,
      details: (subject, answer) =>
        `${subject} is associated with recording artist ${answer}.`,
    }),
  compositionComposer: (count) =>
    relation({
      id: "composition-composer",
      topic: "music",
      subtopic: "Classical Music",
      count,
      where:
        "?subject wdt:P31 wd:Q207628; wdt:P86 ?answer. FILTER NOT EXISTS { ?subject wdt:P86 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Who composed ${subject}?`,
      explanation: (subject, answer) => `${answer} composed ${subject}.`,
      details: (subject, answer) =>
        `${subject} is a musical composition credited to ${answer}.`,
    }),
  bandOrigin: (count) =>
    relation({
      id: "band-origin",
      topic: "music",
      subtopic: "Bands",
      count,
      where:
        "?subject wdt:P31 wd:Q215380; wdt:P740 ?answer. FILTER NOT EXISTS { ?subject wdt:P740 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Where was the band ${subject} formed?`,
      explanation: (subject, answer) => `${subject} was formed in ${answer}.`,
      details: (subject, answer) =>
        `${answer} is recorded as the formation location of ${subject}.`,
    }),
  instrumentOrigin: (count) =>
    relation({
      id: "instrument-origin",
      topic: "music",
      subtopic: "Instruments",
      count,
      where:
        "?subject wdt:P31 wd:Q34379; wdt:P495 ?answer. FILTER NOT EXISTS { ?subject wdt:P495 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) =>
        `Which country is associated with the origin of the ${subject}?`,
      explanation: (subject, answer) =>
        `The ${subject} is associated with ${answer}.`,
      details: (subject, answer) =>
        `${answer} is recorded as the country of origin for the ${subject}.`,
    }),
  dishOrigin: (count) =>
    relation({
      id: "dish-origin",
      topic: "lifestyle-culture",
      subtopic: "Food & Drink",
      count,
      where:
        "?subject wdt:P31 wd:Q746549; wdt:P495 ?answer. FILTER NOT EXISTS { ?subject wdt:P495 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) =>
        `Which country is associated with the origin of ${subject}?`,
      explanation: (subject, answer) =>
        `${subject} is associated with ${answer}.`,
      details: (subject, answer) =>
        `${answer} is recorded as the country of origin for ${subject}.`,
    }),
  dishIngredient: (count) =>
    relation({
      id: "dish-ingredient",
      topic: "lifestyle-culture",
      subtopic: "Cooking",
      count,
      where:
        "?subject wdt:P31 wd:Q746549; wdt:P527 ?answer. FILTER NOT EXISTS { ?subject wdt:P527 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) =>
        `Which ingredient is a defining component of ${subject}?`,
      explanation: (subject, answer) =>
        `${answer} is a component of ${subject}.`,
      details: (subject, answer) =>
        `${answer} is recorded as a principal component used in ${subject}.`,
    }),
  gameCreator: (count) =>
    relation({
      id: "game-creator",
      topic: "lifestyle-culture",
      subtopic: "Games",
      count,
      where:
        "?subject wdt:P31 wd:Q131436; wdt:P170 ?answer. FILTER NOT EXISTS { ?subject wdt:P170 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Who created the game ${subject}?`,
      explanation: (subject, answer) => `${answer} created ${subject}.`,
      details: (subject, answer) =>
        `${subject} credits ${answer} as its creator or designer.`,
    }),
  languageScript: (count) =>
    relation({
      id: "language-script",
      topic: "lifestyle-culture",
      subtopic: "Language",
      count,
      where:
        "?subject wdt:P31 wd:Q34770; wdt:P282 ?answer. FILTER NOT EXISTS { ?subject wdt:P282 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Which writing system is used for ${subject}?`,
      explanation: (subject, answer) => `${subject} uses ${answer}.`,
      details: (subject, answer) =>
        `${answer} is the writing system recorded for ${subject}.`,
    }),
  holidayCountry: (count) =>
    relation({
      id: "holiday-country",
      topic: "lifestyle-culture",
      subtopic: "Holidays & Customs",
      count,
      where:
        "?subject wdt:P31 wd:Q1197685; wdt:P17 ?answer. FILTER NOT EXISTS { ?subject wdt:P17 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Which country observes ${subject}?`,
      explanation: (subject, answer) => `${subject} is observed in ${answer}.`,
      details: (subject, answer) =>
        `${answer} is the country recorded as observing ${subject}.`,
    }),
  spacecraftOperator: (count) =>
    relation({
      id: "spacecraft-operator",
      topic: "science-nature",
      subtopic: "Spaceflight",
      count,
      where:
        "?subject wdt:P31 wd:Q40218; wdt:P137 ?answer. FILTER NOT EXISTS { ?subject wdt:P137 ?other. FILTER(?other != ?answer) }",
      prompt: (subject) => `Which organization operated ${subject}?`,
      explanation: (subject, answer) => `${answer} operated ${subject}.`,
      details: (subject, answer) =>
        `${subject} is recorded as a spacecraft operated by ${answer}.`,
    }),
  spacecraftLaunchYear: (count) =>
    relation({
      id: "spacecraft-launch-year",
      topic: "science-nature",
      subtopic: "Spaceflight",
      count,
      where:
        "?subject wdt:P31 wd:Q40218; wdt:P619 ?date. BIND(STR(YEAR(?date)) AS ?answer)",
      prompt: (subject) => `In what year was ${subject} launched?`,
      explanation: (subject, answer) => `${subject} was launched in ${answer}.`,
      details: (subject, answer) =>
        `${answer} is the recorded launch year for spacecraft ${subject}.`,
    }),
};

const packDefinitions = [
  {
    slug: "science-nature-starter",
    difficulty: [14, 19, 29, 19, 14],
    specs: [
      specs.elementSymbol(16),
      specs.elementNumber(16),
      specs.moonParent(16),
      specs.scientistField(16),
      specs.constellationAbbreviation(16),
      specs.diseaseSpecialty(15),
    ],
  },
  {
    slug: "history-starter",
    curated: true,
  },
  {
    slug: "geography-starter",
    difficulty: [14, 19, 29, 19, 14],
    specs: [
      specs.countryCapital(19),
      specs.countryContinent(19),
      specs.riverMouth(19),
      specs.mountainCountry(19),
      specs.landmarkCountry(19),
    ],
  },
  {
    slug: "sports-starter",
    difficulty: [14, 19, 29, 19, 14],
    specs: [
      specs.athleteSport(19),
      specs.athleteCountry(19),
      specs.teamSport(21),
      specs.teamVenue(17),
      specs.competitionSport(19),
    ],
  },
  {
    slug: "arts-literature-starter",
    difficulty: [14, 19, 29, 19, 14],
    specs: [
      specs.paintingArtist(24),
      specs.bookAuthor(24),
      specs.sculptureArtist(24),
      specs.buildingArchitect(23),
    ],
  },
  {
    slug: "film-television-starter",
    difficulty: [14, 19, 29, 19, 14],
    specs: [
      specs.filmDirector(24),
      specs.filmCountry(24),
      specs.televisionCreator(23),
      specs.filmComposer(24),
    ],
  },
  {
    slug: "music-starter",
    difficulty: [14, 19, 29, 19, 14],
    specs: [
      specs.songPerformer(19),
      specs.albumArtist(19),
      specs.compositionComposer(19),
      specs.bandOrigin(19),
      specs.instrumentOrigin(19),
    ],
  },
  {
    slug: "lifestyle-culture-starter",
    difficulty: [14, 19, 29, 19, 14],
    specs: [
      specs.dishOrigin(19),
      specs.dishIngredient(19),
      specs.gameCreator(19),
      specs.languageScript(19),
      specs.holidayCountry(19),
    ],
  },
  {
    slug: "space-and-beyond",
    difficulty: [0, 0, 10, 30, 10],
    specs: [
      specs.spacecraftOperator(12),
      specs.spacecraftLaunchYear(2),
      specs.moonParent(12),
      specs.scientistField(12),
      specs.elementNumber(12),
    ],
  },
  {
    slug: "world-turning-points",
    curated: true,
  },
  {
    slug: "masterworks",
    difficulty: [5, 10, 20, 10, 5],
    specs: [
      specs.paintingArtist(13),
      specs.bookAuthor(13),
      specs.sculptureArtist(13),
      specs.buildingArchitect(11),
    ],
  },
  {
    slug: "sound-and-song",
    difficulty: [5, 10, 20, 10, 5],
    specs: [
      specs.songPerformer(10),
      specs.albumArtist(10),
      specs.compositionComposer(10),
      specs.bandOrigin(10),
      specs.instrumentOrigin(10),
    ],
  },
  {
    slug: "easy-does-it",
    difficulty: [25, 15, 10, 0, 0],
    specs: [
      specs.countryCapital(7, true),
      specs.elementSymbol(7, true),
      specs.paintingArtist(6),
      specs.bookAuthor(6),
      specs.filmDirector(6),
      specs.songPerformer(6),
      specs.athleteSport(6),
      specs.dishOrigin(6),
    ],
  },
  {
    slug: "trivia-101",
    difficulty: [20, 18, 10, 2, 0],
    specs: [
      specs.countryContinent(8),
      specs.elementNumber(8, true),
      specs.eventYear(2, "easy-event-year", "World Events"),
      specs.mountainCountry(7),
      specs.teamSport(7),
      specs.instrumentOrigin(6),
      specs.languageScript(6),
      specs.holidayCountry(6),
    ],
  },
];

const selectedPack = process.argv[2];
const selectedDefinition = selectedPack
  ? packDefinitions.find((definition) => definition.slug === selectedPack)
  : null;
if (selectedPack && !selectedDefinition)
  throw new Error(`Unknown pack: ${selectedPack}`);
if (selectedDefinition?.curated)
  throw new Error(
    `${selectedPack} is curated and cannot be overwritten by the automatic generator`,
  );

const curatedPackSlugs = new Set(
  packDefinitions
    .filter((definition) => definition.curated)
    .map((definition) => definition.slug),
);
const globalPrompts = new Set();
for (const file of readdirSync(outputDirectory).filter((name) => {
  if (!name.endsWith(".json")) return false;
  if (selectedPack) return name !== `${selectedPack}.json`;
  return curatedPackSlugs.has(name.replace(/\.json$/, ""));
})) {
  const questions = JSON.parse(
    readFileSync(resolve(outputDirectory, file), "utf8"),
  );
  for (const question of questions)
    globalPrompts.add(`${question.topicSlug}|${normalize(question.prompt)}`);
}

for (const pack of packDefinitions.filter(
  (definition) =>
    !definition.curated && (!selectedPack || definition.slug === selectedPack),
)) {
  const groups = [];
  for (const spec of pack.specs) {
    process.stdout.write(`Fetching ${pack.slug}/${spec.id}... `);
    const rows = await rowsFor(spec);
    const answers = [
      ...new Map(
        [...rows.map(answerText), ...spec.fallbackAnswers]
          .filter(Boolean)
          .map((answer) => [normalize(answer), answer]),
      ).values(),
    ];
    const questions = [];
    for (
      let index = 0;
      index < rows.length && questions.length < spec.count;
      index += 1
    ) {
      const question = makeQuestion(pack, spec, rows[index], answers, index);
      const promptKey = `${question.topicSlug}|${normalize(question.prompt)}`;
      if (globalPrompts.has(promptKey)) continue;
      globalPrompts.add(promptKey);
      questions.push(question);
    }
    if (questions.length !== spec.count)
      throw new Error(
        `${pack.slug}/${spec.id} produced ${questions.length}/${spec.count} questions`,
      );
    groups.push(questions);
    console.log(`${questions.length}`);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }

  const interleaved = [];
  for (let row = 0; interleaved.length < groups.flat().length; row += 1)
    for (const group of groups) if (group[row]) interleaved.push(group[row]);

  const difficulties = difficultySequence(pack.difficulty);
  if (interleaved.length !== difficulties.length)
    throw new Error(
      `${pack.slug} produced ${interleaved.length} questions for ${difficulties.length} difficulty slots`,
    );
  interleaved.forEach((question, index) => {
    question.difficulty = difficulties[index];
  });

  writeFileSync(
    resolve(outputDirectory, `${pack.slug}.json`),
    `${JSON.stringify(interleaved, null, 2)}\n`,
  );
  console.log(`Wrote ${pack.slug}: ${interleaved.length}`);
}
