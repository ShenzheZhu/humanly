#!/usr/bin/env node

import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const SEED_DIR = path.join(DATA_DIR, "texts", "non_english_seeds");
const MANIFEST_PATH = path.join(DATA_DIR, "translation-seeds.csv");

const USER_AGENT = "humanly-research-translation-seed-collector/0.1";

const SOURCES = [
  {
    id: "pg14155",
    gutenberg_id: "14155",
    language: "fr",
    author: "Gustave Flaubert",
    title: "Madame Bovary",
    url: "https://www.gutenberg.org/cache/epub/14155/pg14155.txt",
  },
  {
    id: "pg17489",
    gutenberg_id: "17489",
    language: "fr",
    author: "Victor Hugo",
    title: "Les misérables Tome I: Fantine",
    url: "https://www.gutenberg.org/cache/epub/17489/pg17489.txt",
  },
  {
    id: "pg2650",
    gutenberg_id: "2650",
    language: "fr",
    author: "Marcel Proust",
    title: "Du côté de chez Swann",
    url: "https://www.gutenberg.org/cache/epub/2650/pg2650.txt",
  },
  {
    id: "pg2000",
    gutenberg_id: "2000",
    language: "es",
    author: "Miguel de Cervantes Saavedra",
    title: "Don Quijote",
    url: "https://www.gutenberg.org/cache/epub/2000/pg2000.txt",
  },
];

const BUCKETS = [
  { length_bucket: "short", min: 120, max: 180, count: 10 },
  { length_bucket: "medium", min: 400, max: 600, count: 10 },
  { length_bucket: "long", min: 1000, max: 1500, count: 10 },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wordCount(text) {
  return (text.match(/\b[\p{L}\p{M}\p{N}’'-]+\b/gu) || []).length;
}

function csvEscape(value) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/plain,*/*",
    },
  });
  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status}`);
  }
  return response.text();
}

function stripGutenbergBoilerplate(text) {
  const normalized = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const startMatch = normalized.match(/\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  const endMatch = normalized.match(/\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  const start = startMatch ? startMatch.index + startMatch[0].length : 0;
  const end = endMatch ? endMatch.index : normalized.length;
  return normalized.slice(start, end).trim();
}

function cleanParagraph(paragraph) {
  return paragraph
    .replace(/\s+/g, " ")
    .replace(/[_*#]+/g, "")
    .trim();
}

function isContentParagraph(paragraph) {
  const text = cleanParagraph(paragraph);
  if (wordCount(text) < 20) return false;
  if (/^(CHAPITRE|CAP[IÍ]TULO|LIVRE|PREMI[EÈ]RE PARTIE|TABLE|NOTES?)(\b|[ .:-])/i.test(text)) {
    return false;
  }
  if (/^(Project Gutenberg|Produced by|End of the Project Gutenberg)/i.test(text)) {
    return false;
  }
  const letterChars = text.match(/\p{L}/gu) || [];
  return letterChars.length >= text.length * 0.45;
}

function paragraphsFromBook(text) {
  return stripGutenbergBoilerplate(text)
    .split(/\n{2,}/)
    .map(cleanParagraph)
    .filter(isContentParagraph);
}

function takeSegment(paragraphs, startIndex, minWords, maxWords) {
  const selected = [];
  for (let index = startIndex; index < paragraphs.length; index += 1) {
    const candidate = [...selected, paragraphs[index]].join("\n\n");
    if (wordCount(candidate) > maxWords && selected.length > 0) break;
    selected.push(paragraphs[index]);
    if (wordCount(selected.join("\n\n")) >= minWords) break;
  }
  const text = selected.join("\n\n");
  const count = wordCount(text);
  if (count < minWords || count > maxWords) return null;
  return { text, nextIndex: startIndex + selected.length + 2 };
}

async function cleanSeedDirectory() {
  await mkdir(SEED_DIR, { recursive: true });
  for (const entry of await readdir(SEED_DIR)) {
    if (entry.endsWith(".txt")) {
      await unlink(path.join(SEED_DIR, entry));
    }
  }
}

async function main() {
  await cleanSeedDirectory();

  const sourceParagraphs = [];
  for (const source of SOURCES) {
    const text = await fetchText(source.url);
    sourceParagraphs.push({
      source,
      paragraphs: paragraphsFromBook(text),
      offsets: {
        short: 12,
        medium: 80,
        long: 160,
      },
    });
    await delay(500);
  }

  const seeds = [];
  for (const bucket of BUCKETS) {
    let sourceIndex = 0;
    while (seeds.filter((seed) => seed.length_bucket === bucket.length_bucket).length < bucket.count) {
      const sourceState = sourceParagraphs[sourceIndex % sourceParagraphs.length];
      const offset = sourceState.offsets[bucket.length_bucket];
      const segment = takeSegment(sourceState.paragraphs, offset, bucket.min, bucket.max);
      if (!segment) {
        sourceState.offsets[bucket.length_bucket] += 3;
        sourceIndex += 1;
        continue;
      }
      const index = seeds.filter((seed) => seed.length_bucket === bucket.length_bucket).length + 1;
      const seedId = `${bucket.length_bucket}_${sourceState.source.language}_${sourceState.source.id}_${String(index).padStart(3, "0")}`;
      const cleanedTextPath = `texts/non_english_seeds/${seedId}.txt`;
      const seed = {
        seed_id: seedId,
        length_bucket: bucket.length_bucket,
        task_type:
          bucket.length_bucket === "short"
            ? "social_media_post"
            : bucket.length_bucket === "medium"
              ? "student_assignment_response"
              : "paper_review",
        seed_language: sourceState.source.language,
        source_platform: "Project Gutenberg",
        source_url: sourceState.source.url,
        source_id: sourceState.source.id,
        source_title: sourceState.source.title,
        author_or_signature: sourceState.source.author,
        license_notes:
          "Project Gutenberg source text; check Project Gutenberg terms and jurisdiction-specific copyright status before redistribution.",
        word_count: wordCount(segment.text),
        cleaned_text_path: cleanedTextPath,
        inclusion_notes:
          "Public-domain-oriented non-English human text used as a scalable C3 translation seed. It is length-controlled but not yet task-aligned to Humanly's social/assignment/review prompts.",
        text: segment.text,
      };
      seeds.push(seed);
      await writeFile(path.join(DATA_DIR, cleanedTextPath), `${segment.text}\n`);
      sourceState.offsets[bucket.length_bucket] = segment.nextIndex;
      sourceIndex += 1;
    }
  }

  const columns = [
    "seed_id",
    "length_bucket",
    "task_type",
    "seed_language",
    "source_platform",
    "source_url",
    "source_id",
    "source_title",
    "author_or_signature",
    "license_notes",
    "word_count",
    "cleaned_text_path",
    "inclusion_notes",
  ];

  const csv = [
    columns.join(","),
    ...seeds.map((seed) =>
      columns.map((column) => csvEscape(seed[column])).join(","),
    ),
  ].join("\n");
  await writeFile(MANIFEST_PATH, `${csv}\n`);

  const counts = seeds.reduce((acc, seed) => {
    acc[seed.length_bucket] = (acc[seed.length_bucket] || 0) + 1;
    return acc;
  }, {});
  for (const seed of seeds) {
    console.log(`${seed.seed_id}: ${seed.word_count} words -> ${seed.cleaned_text_path}`);
  }
  console.log(`translation seed counts: ${JSON.stringify(counts)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
