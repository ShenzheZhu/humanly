#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const OUTPUT_MANIFEST_PATH = path.join(DATA_DIR, "c3-short-forum-candidates.csv");
const OUTPUT_DIR = path.join(DATA_DIR, "texts", "non_english_seeds");

const STACK_EXCHANGE_LICENSE_URL = "https://stackoverflow.com/help/licensing";
const TARGET_COUNT = 10;
const MIN_WORDS = 120;
const MAX_WORDS = 180;
const FROM_DATE = 1293840000; // 2011-01-01
const TO_DATE = 1483228799; // 2016-12-31
const USER_AGENT = "humanly-c3-short-forum-seed-collector/0.1";

const SITES = [
  {
    site: "german",
    language: "de",
    platform: "German Stack Exchange",
    stopwords: [" der ", " die ", " das ", " und ", " ist ", " nicht ", " mit ", " für ", " ich ", " ein ", " eine ", " auf ", " zu ", " den "],
  },
  {
    site: "spanish",
    language: "es",
    platform: "Spanish Stack Exchange",
    stopwords: [" que ", " de ", " el ", " la ", " los ", " las ", " una ", " para ", " con ", " por ", " como ", " pero ", " porque ", "¿", "¡"],
  },
  {
    site: "french",
    language: "fr",
    platform: "French Stack Exchange",
    stopwords: [" que ", " de ", " le ", " la ", " les ", " des ", " une ", " pour ", " avec ", " dans ", " est ", " pas ", " mais ", " pourquoi "],
  },
  {
    site: "portuguese",
    language: "pt",
    platform: "Portuguese Stack Exchange",
    stopwords: [" que ", " de ", " o ", " a ", " os ", " as ", " uma ", " para ", " com ", " por ", " como ", " mas ", " porque ", " não "],
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function csvEscape(value) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function decodeHtml(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function cleanHtml(html) {
  return decodeHtml(
    String(html || "")
      .replace(/<pre><code>[\s\S]*?<\/code><\/pre>/gi, " ")
      .replace(/<blockquote>[\s\S]*?<\/blockquote>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text) {
  return (text.match(/\b[\p{L}\p{M}\p{N}’'-]+\b/gu) || []).length;
}

function languageScore(text, stopwords) {
  const lower = ` ${text.toLowerCase()} `;
  return stopwords.reduce((score, stopword) => score + (lower.includes(stopword) ? 1 : 0), 0);
}

async function fetchQuestions(siteConfig, sort) {
  const url = new URL("https://api.stackexchange.com/2.3/questions");
  url.searchParams.set("page", "1");
  url.searchParams.set("pagesize", "100");
  url.searchParams.set("fromdate", String(FROM_DATE));
  url.searchParams.set("todate", String(TO_DATE));
  url.searchParams.set("order", "desc");
  url.searchParams.set("sort", sort);
  url.searchParams.set("site", siteConfig.site);
  url.searchParams.set("filter", "withbody");

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Stack Exchange API returned non-JSON for ${siteConfig.site}: ${text.slice(0, 120)}`);
  }
  if (!response.ok || payload.error_message) {
    throw new Error(`Stack Exchange API failed for ${siteConfig.site}: ${payload.error_message || response.status}`);
  }
  return payload.items || [];
}

function isUsableQuestion(question, siteConfig) {
  if (/<pre|<code/i.test(question.body || "")) return false;
  const text = cleanHtml(question.body);
  const words = wordCount(text);
  if (words < MIN_WORDS || words > MAX_WORDS) return null;
  if (languageScore(text, siteConfig.stopwords) < 5) return null;
  if (/^\s*(english|anglais|inglés|deutsch)\b/i.test(text)) return null;
  return {
    text,
    words,
  };
}

async function main() {
  const candidates = [];
  const seenLinks = new Set();
  for (const siteConfig of SITES) {
    for (const sort of ["votes", "creation", "activity"]) {
      await sleep(650);
      for (const question of await fetchQuestions(siteConfig, sort)) {
        if (seenLinks.has(question.link)) continue;
        seenLinks.add(question.link);
        const usable = isUsableQuestion(question, siteConfig);
        if (!usable) continue;
        candidates.push({
          siteConfig,
          question,
          ...usable,
          language_score: languageScore(usable.text, siteConfig.stopwords),
        });
      }
    }
  }

  const selected = candidates
    .sort(
      (left, right) =>
        right.language_score - left.language_score ||
        right.question.score - left.question.score ||
        left.question.creation_date - right.question.creation_date,
    )
    .slice(0, TARGET_COUNT);

  if (selected.length < TARGET_COUNT) {
    throw new Error(`Only found ${selected.length} C3 short forum candidates`);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const rows = [];
  for (const [index, candidate] of selected.entries()) {
    const ordinal = String(index + 1).padStart(3, "0");
    const seedId = `short_${candidate.siteConfig.language}_stackexchange_${ordinal}`;
    const cleanedTextPath = `texts/non_english_seeds/${seedId}.txt`;
    await writeFile(path.join(DATA_DIR, cleanedTextPath), `${candidate.text}\n`);
    rows.push({
      seed_id: seedId,
      length_bucket: "short",
      task_type: "social_media_post",
      seed_language: candidate.siteConfig.language,
      source_platform: candidate.siteConfig.platform,
      source_url: candidate.question.link,
      source_id: String(candidate.question.question_id),
      source_title: decodeHtml(candidate.question.title),
      author_or_signature: candidate.question.owner?.display_name || "",
      license_notes:
        `Public Stack Exchange question body; Stack Exchange public contributions are distributed under CC BY-SA terms described at ${STACK_EXCHANGE_LICENSE_URL}.`,
      word_count: candidate.words,
      cleaned_text_path: cleanedTextPath,
      inclusion_notes:
        "Pre-2017 non-English forum-style question used as a task-aligned C3 short translation seed; Reddit-like public post fallback with clearer API access and licensing.",
      created_utc: new Date(candidate.question.creation_date * 1000).toISOString(),
      score: candidate.question.score,
    });
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
    "created_utc",
    "score",
  ];
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");
  await writeFile(OUTPUT_MANIFEST_PATH, `${csv}\n`);

  console.log(`selected ${rows.length} C3 short forum candidate(s)`);
  console.log(`wrote ${path.relative(process.cwd(), OUTPUT_MANIFEST_PATH)}`);
  for (const row of rows) {
    console.log(`${row.seed_id}: ${row.seed_language}, ${row.word_count} words, ${row.source_title}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
