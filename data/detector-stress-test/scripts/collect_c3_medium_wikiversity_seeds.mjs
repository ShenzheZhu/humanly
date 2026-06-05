#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const OUTPUT_MANIFEST_PATH = path.join(DATA_DIR, "c3-medium-wikiversity-candidates.csv");
const OUTPUT_DIR = path.join(DATA_DIR, "texts", "non_english_seeds");

const TARGET_COUNT = 10;
const MIN_WORDS = 400;
const MAX_WORDS = 600;
const REVISION_CUTOFF = "2017-01-01T00:00:00Z";
const USER_AGENT = "humanly-c3-medium-wikiversity-seed-collector/0.1";
const REQUEST_DELAY_MS = Number(process.env.WIKIVERSITY_REQUEST_DELAY_MS || "4000");

const SOURCES = [
  {
    host: "es.wikiversity.org",
    language: "es",
    platform: "Spanish Wikiversity",
    searchTerms: [
      "psicología aprendizaje motivación educación universidad",
      "motivación aprendizaje",
      "psicología básica",
      "sociología educación",
      "filosofía ciencia",
      "biología célula",
      "historia cultura",
      "economía sociedad",
    ],
  },
  {
    host: "fr.wikiversity.org",
    language: "fr",
    platform: "French Wikiversity",
    searchTerms: [
      "psychologie apprentissage motivation éducation",
      "sociologie éducation",
      "philosophie science",
      "biologie cellule",
      "histoire culture",
      "économie société",
      "apprentissage mémoire",
    ],
  },
  {
    host: "de.wikiversity.org",
    language: "de",
    platform: "German Wikiversity",
    searchTerms: [
      "Psychologie Lernen Motivation Bildung",
      "Soziologie Bildung",
      "Philosophie Wissenschaft",
      "Biologie Zelle",
      "Geschichte Kultur",
      "Wirtschaft Gesellschaft",
      "Lernen Gedächtnis",
    ],
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
  return String(text || "")
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

function stripTemplates(text) {
  let output = text;
  for (let pass = 0; pass < 8; pass += 1) {
    const next = output.replace(/\{\{[^{}]*\}\}/g, " ");
    if (next === output) break;
    output = next;
  }
  return output;
}

function cleanWikiText(text) {
  return decodeHtml(
    stripTemplates(String(text || ""))
      .replace(/<ref[\s\S]*?<\/ref>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[\[(?:File|Archivo|Fichier|Datei):[^\]]+\]\]/gi, " ")
      .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\[https?:\/\/[^\s\]]+\s*([^\]]*)\]/g, "$1")
      .replace(/'{2,}/g, "")
      .replace(/^=+\s*|\s*=+$/gm, " ")
      .replace(/^\s*[#*;:].*$/gm, " ")
      .replace(/\|[^=\n]+=[^\n]*/g, " ")
      .replace(/__\w+__/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text) {
  return (text.match(/\b[\p{L}\p{M}\p{N}’'-]+\b/gu) || []).length;
}

function extractSegment(wikiText) {
  const paragraphs = String(wikiText || "")
    .split(/\n{2,}/)
    .map(cleanWikiText)
    .filter((paragraph) => wordCount(paragraph) >= 40);

  for (let start = 0; start < paragraphs.length; start += 1) {
    let combined = "";
    for (let end = start; end < paragraphs.length; end += 1) {
      combined = `${combined}${combined ? "\n\n" : ""}${paragraphs[end]}`;
      const words = wordCount(combined);
      if (words >= MIN_WORDS && words <= MAX_WORDS) return combined;
      if (words > MAX_WORDS) break;
    }
  }

  const cleaned = cleanWikiText(wikiText);
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS) return null;
  return words.slice(0, MAX_WORDS).join(" ");
}

async function fetchJson(url) {
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
    throw new Error(`MediaWiki API returned non-JSON: ${text.slice(0, 120)}`);
  }
  if (!response.ok || payload.error) {
    throw new Error(`MediaWiki API failed: ${payload.error?.info || response.status}`);
  }
  return payload;
}

async function searchTitles(source, searchTerm) {
  const url = new URL(`https://${source.host}/w/api.php`);
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", searchTerm);
  url.searchParams.set("srlimit", "20");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  const payload = await fetchJson(url);
  return (payload.query?.search || []).map((item) => decodeHtml(item.title));
}

async function fetchOldRevision(source, title) {
  const url = new URL(`https://${source.host}/w/api.php`);
  url.searchParams.set("action", "query");
  url.searchParams.set("prop", "revisions");
  url.searchParams.set("titles", title);
  url.searchParams.set("rvlimit", "1");
  url.searchParams.set("rvdir", "older");
  url.searchParams.set("rvstart", REVISION_CUTOFF);
  url.searchParams.set("rvprop", "ids|timestamp|content");
  url.searchParams.set("rvslots", "main");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  const payload = await fetchJson(url);
  const page = Object.values(payload.query?.pages || {})[0];
  const revision = page?.revisions?.[0];
  if (!revision) return null;
  return {
    title: page.title,
    revision_id: revision.revid,
    timestamp: revision.timestamp,
    content: revision.slots?.main?.["*"] || "",
  };
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const candidates = [];
  const seenPages = new Set();

  for (const source of SOURCES) {
    for (const term of source.searchTerms) {
      await sleep(REQUEST_DELAY_MS);
      let titles = [];
      try {
        titles = await searchTitles(source, term);
      } catch (error) {
        console.warn(`search skipped for ${source.host}/${term}: ${error.message}`);
        continue;
      }

      for (const title of titles) {
        const pageKey = `${source.host}::${title}`;
        if (seenPages.has(pageKey)) continue;
        seenPages.add(pageKey);
        await sleep(REQUEST_DELAY_MS);
        let revision;
        try {
          revision = await fetchOldRevision(source, title);
        } catch (error) {
          console.warn(`revision skipped for ${source.host}/${title}: ${error.message}`);
          continue;
        }
        if (!revision) continue;
        const text = extractSegment(revision.content);
        if (!text) continue;
        const words = wordCount(text);
        if (words < MIN_WORDS || words > MAX_WORDS) continue;
        candidates.push({
          source,
          revision,
          text,
          words,
        });
        console.log(`candidate ${candidates.length}: ${source.host} ${revision.title} (${words} words)`);
        if (candidates.length >= TARGET_COUNT) break;
      }
      if (candidates.length >= TARGET_COUNT) break;
    }
    if (candidates.length >= TARGET_COUNT) break;
  }

  if (candidates.length < TARGET_COUNT) {
    throw new Error(`Only found ${candidates.length} C3 medium Wikiversity candidates`);
  }

  const rows = [];
  for (const [index, candidate] of candidates.slice(0, TARGET_COUNT).entries()) {
    const ordinal = String(index + 1).padStart(3, "0");
    const seedId = `medium_${candidate.source.language}_wikiversity_${ordinal}`;
    const cleanedTextPath = `texts/non_english_seeds/${seedId}.txt`;
    await writeFile(path.join(DATA_DIR, cleanedTextPath), `${candidate.text}\n`);
    const oldIdUrl = `https://${candidate.source.host}/w/index.php?oldid=${candidate.revision.revision_id}`;
    rows.push({
      seed_id: seedId,
      length_bucket: "medium",
      task_type: "student_assignment_response",
      seed_language: candidate.source.language,
      source_platform: candidate.source.platform,
      source_url: oldIdUrl,
      source_id: String(candidate.revision.revision_id),
      source_title: candidate.revision.title,
      author_or_signature: "Wikiversity contributors",
      license_notes:
        "Wikiversity user-contributed educational text; follow Wikimedia project reuse terms and CC BY-SA attribution requirements for the specific old revision.",
      word_count: candidate.words,
      cleaned_text_path: cleanedTextPath,
      inclusion_notes:
        "Pre-2017 non-English Wikiversity educational/student-learning excerpt used as a task-aligned C3 medium translation seed.",
      created_utc: candidate.revision.timestamp,
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
  ];
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");
  await writeFile(OUTPUT_MANIFEST_PATH, `${csv}\n`);

  console.log(`selected ${rows.length} C3 medium Wikiversity candidate(s)`);
  console.log(`wrote ${path.relative(process.cwd(), OUTPUT_MANIFEST_PATH)}`);
  for (const row of rows) {
    console.log(`${row.seed_id}: ${row.seed_language}, ${row.word_count} words, ${row.source_title}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
