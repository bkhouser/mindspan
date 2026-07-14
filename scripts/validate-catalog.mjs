import { loadCatalog } from "./catalog-lib.mjs";

const { questions, summaries } = loadCatalog();
console.table(summaries);
console.log(
  `Catalog validation passed for ${questions.length} generated questions.`,
);
