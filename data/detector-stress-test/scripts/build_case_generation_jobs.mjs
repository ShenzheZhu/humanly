#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const HUMAN_SEEDS_PATH = path.join(DATA_DIR, "human-seeds.csv");
const TRANSLATION_SEEDS_PATH = path.join(DATA_DIR, "translation-seeds.csv");
const OPENREVIEW_CONTEXTS_PATH = path.join(DATA_DIR, "openreview-paper-contexts.csv");
const GENERATED_SAMPLES_PATH = path.join(DATA_DIR, "generated-samples.csv");
const JOBS_PATH = path.join(DATA_DIR, "case-generation-jobs.jsonl");

const GENERATED_SOURCE_DIR = path.join(DATA_DIR, "texts", "generated", "source");
const GENERATED_FINAL_DIR = path.join(DATA_DIR, "texts", "generated", "final");
const GENERATED_INTERMEDIATE_DIR = path.join(DATA_DIR, "texts", "generated", "intermediate");
const GENERATED_TASK_CARD_DIR = path.join(DATA_DIR, "texts", "generated", "task_cards");

const CASES = [
  {
    case_id: "C1",
    case_name: "Human original",
    policy_label: "compliant",
    origin_label: "human_origin",
    expected_document_class: "HUMAN_ONLY",
    seed_type: "human_english",
  },
  {
    case_id: "C2",
    case_name: "Human + AI polish",
    policy_label: "compliant",
    origin_label: "human_origin",
    expected_document_class: "MIXED",
    seed_type: "human_english",
  },
  {
    case_id: "C3",
    case_name: "Human + AI translation",
    policy_label: "compliant",
    origin_label: "human_origin",
    expected_document_class: "MIXED",
    seed_type: "human_non_english",
  },
  {
    case_id: "C4",
    case_name: "Human-written AI-style text",
    policy_label: "compliant",
    origin_label: "human_origin",
    expected_document_class: "HUMAN_ONLY",
    seed_type: "human_ai_style",
  },
  {
    case_id: "N1",
    case_name: "Direct AI-generated",
    policy_label: "non_compliant",
    origin_label: "ai_origin",
    expected_document_class: "AI_ONLY",
    seed_type: "none",
  },
  {
    case_id: "N2",
    case_name: "AI-obfuscated",
    policy_label: "non_compliant",
    origin_label: "ai_origin",
    expected_document_class: "AI_ONLY",
    seed_type: "ai_generated",
  },
  {
    case_id: "N3",
    case_name: "AI cross-lingual transform",
    policy_label: "non_compliant",
    origin_label: "ai_origin",
    expected_document_class: "AI_ONLY",
    seed_type: "ai_generated",
  },
  {
    case_id: "N4",
    case_name: "AI-generated + human light edits",
    policy_label: "non_compliant",
    origin_label: "mixed_ai_origin",
    expected_document_class: "MIXED",
    seed_type: "ai_generated",
  },
];

const PROMPT_FAMILIES = {
  short: {
    prompt_id: "short_social_process_001",
    task_type: "social_media_post",
    target: "120-180 words",
  },
  medium: {
    prompt_id: "medium_assignment_process_001",
    task_type: "student_assignment_response",
    target: "400-600 words",
  },
  long: {
    prompt_id: "long_peer_review_process_001",
    task_type: "paper_review",
    target: "1000-1500 words",
  },
};

function wordCount(text) {
  return (text.match(/\b[\p{L}\p{M}\p{N}’'-]+\b/gu) || []).length;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === '"' && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (!quoted && char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...records] = rows.filter((record) => record.length > 1);
  return records.map((record) =>
    Object.fromEntries(header.map((column, index) => [column, record[index] ?? ""])),
  );
}

function csvEscape(value) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(relativePath) {
  return readFile(path.join(DATA_DIR, relativePath), "utf8");
}

async function readJsonIfExists(relativePath) {
  const absolutePath = path.join(DATA_DIR, relativePath);
  if (!(await exists(absolutePath))) return null;
  return JSON.parse(await readFile(absolutePath, "utf8"));
}

async function readCsvIfExists(filePath) {
  if (!(await exists(filePath))) return [];
  return parseCsv(await readFile(filePath, "utf8"));
}

async function writeRelative(relativePath, text) {
  await writeFile(path.join(DATA_DIR, relativePath), text.endsWith("\n") ? text : `${text}\n`);
}

function sampleId(caseId, lengthBucket, index) {
  return `${caseId.toLowerCase()}_${lengthBucket}_${String(index).padStart(2, "0")}`;
}

function matchedSetId(lengthBucket, index) {
  return `${PROMPT_FAMILIES[lengthBucket].prompt_id}_set${String(index).padStart(2, "0")}`;
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function compactWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function excerpt(text, maxWords) {
  const words = compactWhitespace(text).split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

function wikiversityTopic(sourceTitle) {
  const parts = sourceTitle.split("/");
  return compactWhitespace(parts[parts.length - 1]?.replace(/_/g, " ") || sourceTitle);
}

function taskCardRelativePath(lengthBucket, index) {
  return `texts/generated/task_cards/${matchedSetId(lengthBucket, index)}.txt`;
}

function buildShortTaskCard({ setId, seed, seedText, target }) {
  return `Seed-derived task card
Matched set: ${setId}
Length bucket: short
Task type: social_media_post
Source seed: ${seed.seed_id}
Source title: ${seed.source_title}
Source note: ${seed.inclusion_notes}
Source URL: ${seed.source_url}
Source excerpt for topic grounding:
${excerpt(seedText, 110)}

Task:
Write an original first-person social-media self-post about the same writing-related topic or situation as the source seed. Preserve the broad topic, emotional stance, and practical concern, but do not summarize the source, copy its wording, mention the source, or refer to this task card.

Target length: ${target}.`;
}

function buildMediumTaskCard({ setId, seed, seedText, target }) {
  const topic = wikiversityTopic(seed.source_title);
  return `Seed-derived task card
Matched set: ${setId}
Length bucket: medium
Task type: student_assignment_response
Source seed: ${seed.seed_id}
Source title: ${seed.source_title}
Derived assignment topic: ${topic}
Source URL: ${seed.source_url}
Source excerpt for topic grounding:
${excerpt(seedText, 140)}

Task:
Write an original university assignment response about ${topic}. Explain the concept in plain language, connect it to motivation, emotion, learning, behavior, or decision-making when relevant, include one concrete example, and state why the topic matters. Do not copy phrases from the source seed or present the response as a summary of the seed.

Target length: ${target}.`;
}

async function buildLongTaskCard({ setId, seed, target, openReviewContexts }) {
  const context = openReviewContexts.get(seed.seed_id);
  if (!context?.paper_context_text_path || !(await exists(path.join(DATA_DIR, context.paper_context_text_path)))) {
    return `Seed-derived task card
Matched set: ${setId}
Length bucket: long
Task type: paper_review
Source seed: ${seed.seed_id}
Source paper title: ${seed.source_title}
Source URL: ${seed.source_url}
Input source warning: OpenReview paper context was not cached. This task card is not paper-ready because it lacks the original paper abstract/body.

Task:
Write an original conference paper review of the paper named above. Include a summary, strengths, weaknesses, questions for the authors, and an overall recommendation. Do not copy any existing review.

Target length: ${target}.`;
  }

  const paperContext = await readText(context.paper_context_text_path);
  return `Seed-derived task card
Matched set: ${setId}
Length bucket: long
Task type: paper_review
Source seed: ${seed.seed_id}
OpenReview forum: ${context.forum_id}
OpenReview URL: ${context.source_url}
Paper context source path: ${context.paper_context_text_path}

Paper context:
${paperContext.trim()}

Task:
Write an original ICLR-style peer review of the paper above. Use the supplied paper context as the input source. Include a concise summary, major strengths, major weaknesses, specific questions for the authors, and an overall recommendation. Do not copy any existing review, do not mention this benchmark, and do not say that you only saw metadata or an excerpt.

Target length: ${target}.`;
}

async function buildTaskCard({ lengthBucket, index, seed, seedText, openReviewContexts }) {
  const setId = matchedSetId(lengthBucket, index);
  const target = PROMPT_FAMILIES[lengthBucket].target;
  if (lengthBucket === "short") {
    return buildShortTaskCard({ setId, seed, seedText, target });
  }
  if (lengthBucket === "medium") {
    return buildMediumTaskCard({ setId, seed, seedText, target });
  }
  return buildLongTaskCard({ setId, seed, target, openReviewContexts });
}

function promptForC2(sourceText, target) {
  return `You are a conservative writing editor. Polish the following human-written draft only for grammar, clarity, and local flow.

Preserve the author's ideas, claims, examples, structure, level of detail, and voice. Do not add new facts, arguments, citations, examples, headings, bullet points, or stylistic flourishes. Prefer plain, precise wording. If the draft is already clear, make only minimal edits. Keep the final text within ${target}. Return only the polished version.

${sourceText}`;
}

function promptForC3(sourceText, target) {
  return `Translate the following human-written text into natural English.

Preserve the author's ideas, examples, structure, uncertainty, and level of detail. Do not improve the argument, add facts, add examples, remove caveats, or make the text more polished than the source warrants. Keep the final text within ${target}. Return only the English translation.

${sourceText}`;
}

function promptForN1(taskCard) {
  return `${taskCard}

Use a polished, coherent style. Do not include headings, bullet points, meta-commentary, citations, or notes about how the response was written. Return only the final response.`;
}

function promptForN2(aiText, target) {
  return `You are an experienced editor. Rewrite the text below so it reads like natural human writing rather than generic AI output.

Use plain, precise wording. Avoid inflated or overused terms unless they are needed for the specific meaning. Remove mechanical transitions such as "first and foremost", "it is worth noting that", and other formulaic connective phrases. Turn list-like structure into coherent paragraphs when possible. Vary sentence length and rhythm, but do not add new facts, arguments, examples, or claims. Preserve the author's intended meaning and keep the final text within ${target}.

If the input already reads naturally, make only minimal edits. Return only the rewritten English text, with no explanation, translation, headings, bullet points, formatting notes, or modification log.

${aiText}`;
}

function promptForN3Chinese(taskCard, target) {
  return `${taskCard}

Write the response in Chinese. Preserve the requested task, audience, and target length in English-equivalent words (${target}). Do not include headings, bullet points, meta-commentary, citations, or notes about how the response was written. Return only the response.`;
}

function promptForN3Translation(sourceText, target) {
  return `Translate the following AI-generated Chinese text into natural English.

Preserve the ideas, structure, level of detail, and original argument. Do not add new facts, examples, citations, or claims. Keep the final text within ${target}. Return only the English translation.

${sourceText}`;
}

function promptForN4(taskCard) {
  return `${taskCard}

Use a polished, coherent style. Do not include headings, bullet points, meta-commentary, citations, or notes about how the response was written. Return only the final response.`;
}

function c4Instruction(taskCard, target) {
  return `Human collection required. Do not use AI to generate, rewrite, translate, or polish the response.

Base task:
${taskCard}

Before writing, read this style guide: write in a polished, formal, template-like style. Use explicit transitions, balanced paragraphs, cautious framing, and generic connective phrases such as "it is important to note", "this highlights", "a key consideration", or "in this context." Intentionally use many words from this AI-associated vocabulary list where they can fit: Accentuate, Ador, Amass, Ameliorate, Amplify, Alleviate, Ascertain, Advocate, Articulate, Bear, Bolster, Bustling, Cherish, Conceptualize, Conjecture, Consolidate, Convey, Culminate, Decipher, Demonstrate, Depict, Devise, Delineate, Delve, Delve Into, Diverge, Disseminate, Elucidate, Endeavor, Engage, Enumerate, Envision, Enduring, Exacerbate, Expedite, Foster, Galvanize, Harmonize, Hone, Innovate, Inscription, Integrate, Interpolate, Intricate, Lasting, Leverage, Manifest, Mediate, Nurture, Nuance, Nuanced, Obscure, Opt, Originates, Perceive, Perpetuate, Permeate, Pivotal, Ponder, Prescribe, Prevailing, Profound, Recapitulate, Reconcile, Rectify, Rekindle, Reimagine, Scrutinize, Substantiate, Tailor, Testament, Transcend, Traverse, Underscore, Unveil, Vibrant.

Write an original response within ${target}.`;
}

async function main() {
  await mkdir(GENERATED_SOURCE_DIR, { recursive: true });
  await mkdir(GENERATED_FINAL_DIR, { recursive: true });
  await mkdir(GENERATED_INTERMEDIATE_DIR, { recursive: true });
  await mkdir(GENERATED_TASK_CARD_DIR, { recursive: true });

  const humanSeeds = parseCsv(await readFile(HUMAN_SEEDS_PATH, "utf8"));
  const translationSeeds = parseCsv(await readFile(TRANSLATION_SEEDS_PATH, "utf8"));
  const openReviewContexts = new Map(
    (await readCsvIfExists(OPENREVIEW_CONTEXTS_PATH)).map((row) => [row.seed_id, row]),
  );

  const rows = [];
  const jobs = [];
  for (const lengthBucket of ["short", "medium", "long"]) {
    const promptFamily = PROMPT_FAMILIES[lengthBucket];
    const englishSeeds = humanSeeds.filter((seed) => seed.length_bucket === lengthBucket);
    const nonEnglishSeeds = translationSeeds.filter((seed) => seed.length_bucket === lengthBucket);
    if (englishSeeds.length < 10) {
      throw new Error(`Need 10 English ${lengthBucket} seeds, found ${englishSeeds.length}`);
    }
    if (nonEnglishSeeds.length < 10) {
      throw new Error(`Need 10 non-English ${lengthBucket} seeds, found ${nonEnglishSeeds.length}`);
    }

    for (let index = 1; index <= 10; index += 1) {
      const englishSeed = englishSeeds[index - 1];
      const translationSeed = nonEnglishSeeds[index - 1];
      const setId = matchedSetId(lengthBucket, index);
      const englishSeedText = await readText(englishSeed.cleaned_text_path);
      const taskCardPath = taskCardRelativePath(lengthBucket, index);
      const taskCard = await buildTaskCard({
        lengthBucket,
        index,
        seed: englishSeed,
        seedText: englishSeedText,
        openReviewContexts,
      });
      await writeRelative(taskCardPath, taskCard);

      for (const caseConfig of CASES) {
        const id = sampleId(caseConfig.case_id, lengthBucket, index);
        const finalPath = `texts/generated/final/${id}.txt`;
        const sourcePath = `texts/generated/source/${id}_source.txt`;
        const jobIds = [];
        let seed = null;
        let seedLanguage = "";
        let seedTextPath = "";
        let sourceTextPath = sourcePath;
        let licenseNotes = "";
        let constructionNotes = "";
        let sampleStatus = "pending_generation";
        let policyLabel = caseConfig.policy_label;
        let originLabel = caseConfig.origin_label;

        if (caseConfig.case_id === "C1") {
          seed = englishSeed;
          seedLanguage = "en";
          seedTextPath = seed.cleaned_text_path;
          licenseNotes = seed.license_notes;
          const sourceText = await readText(seed.cleaned_text_path);
          await writeRelative(sourcePath, sourceText);
          await writeRelative(finalPath, sourceText);
          constructionNotes = "Human English seed used as final text without AI transformation.";
          sampleStatus = "ready";
        } else if (caseConfig.case_id === "C2") {
          seed = englishSeed;
          seedLanguage = "en";
          seedTextPath = seed.cleaned_text_path;
          licenseNotes = `${seed.license_notes} AI polish output requires generation metadata.`;
          const sourceText = await readText(seed.cleaned_text_path);
          await writeRelative(sourcePath, sourceText);
          const jobId = `${id}_polish`;
          jobIds.push(jobId);
          jobs.push({
            job_id: jobId,
            sample_id: id,
            case_id: "C2",
            job_type: "chat_completion",
            requires_api: true,
            dependency_job_ids: [],
            input_text_path: sourcePath,
            output_text_path: finalPath,
            prompt_template: promptForC2("{{INPUT_TEXT}}", promptFamily.target),
            construction_notes: "AI polish of human-written English seed.",
          });
          constructionNotes = "Pending AI polish of human English seed.";
        } else if (caseConfig.case_id === "C3") {
          seed = translationSeed;
          seedLanguage = seed.seed_language;
          seedTextPath = seed.cleaned_text_path;
          licenseNotes = `${seed.license_notes} AI translation output requires generation metadata.`;
          const sourceText = await readText(seed.cleaned_text_path);
          await writeRelative(sourcePath, sourceText);
          const jobId = `${id}_translate`;
          jobIds.push(jobId);
          jobs.push({
            job_id: jobId,
            sample_id: id,
            case_id: "C3",
            job_type: "chat_completion",
            requires_api: true,
            dependency_job_ids: [],
            input_text_path: sourcePath,
            output_text_path: finalPath,
            prompt_template: promptForC3("{{INPUT_TEXT}}", promptFamily.target),
            construction_notes: "AI translation of human-written non-English seed.",
          });
          constructionNotes = "Pending AI translation of human non-English seed.";
        } else if (caseConfig.case_id === "C4") {
          sourceTextPath = sourcePath;
          await writeRelative(sourcePath, c4Instruction(taskCard, promptFamily.target));
          constructionNotes = "Requires human writer to produce AI-style human-origin text; no AI generation allowed.";
          licenseNotes = "Newly collected human-origin text requires participant/writer confirmation before use.";
          sampleStatus = "pending_human_collection";
        } else if (caseConfig.case_id === "N1") {
          await writeRelative(sourcePath, promptForN1(taskCard));
          const jobId = `${id}_direct_ai`;
          jobIds.push(jobId);
          jobs.push({
            job_id: jobId,
            sample_id: id,
            case_id: "N1",
            job_type: "chat_completion",
            requires_api: true,
            dependency_job_ids: [],
            input_text_path: sourcePath,
            output_text_path: finalPath,
            prompt_template: "{{INPUT_TEXT}}",
            input_text_sha256: sha256(await readText(sourcePath)),
            construction_notes: "Direct AI generation from seed-derived matched task card.",
          });
          constructionNotes = "Pending direct AI generation from seed-derived matched task card.";
          licenseNotes = "Synthetic AI-origin sample; model/provider metadata required.";
        } else if (caseConfig.case_id === "N2") {
          const n1Id = sampleId("N1", lengthBucket, index);
          const n1JobId = `${n1Id}_direct_ai`;
          const jobId = `${id}_humanize`;
          jobIds.push(jobId);
          sourceTextPath = `texts/generated/final/${n1Id}.txt`;
          jobs.push({
            job_id: jobId,
            sample_id: id,
            case_id: "N2",
            job_type: "chat_completion",
            requires_api: true,
            dependency_job_ids: [n1JobId],
            input_text_path: sourceTextPath,
            output_text_path: finalPath,
            prompt_template: promptForN2("{{INPUT_TEXT}}", promptFamily.target),
            construction_notes: "Humanizer-style rewrite of direct AI output.",
          });
          constructionNotes = "Pending humanizer-style rewrite of N1 AI output.";
          licenseNotes = "Synthetic AI-origin sample; model/provider metadata required.";
        } else if (caseConfig.case_id === "N3") {
          const chinesePath = `texts/generated/intermediate/${id}_zh.txt`;
          const genJobId = `${id}_generate_zh`;
          const translateJobId = `${id}_translate_en`;
          jobIds.push(genJobId, translateJobId);
          await writeRelative(sourcePath, promptForN3Chinese(taskCard, promptFamily.target));
          jobs.push({
            job_id: genJobId,
            sample_id: id,
            case_id: "N3",
            job_type: "chat_completion",
            requires_api: true,
            dependency_job_ids: [],
            input_text_path: sourcePath,
            output_text_path: chinesePath,
            prompt_template: "{{INPUT_TEXT}}",
            input_text_sha256: sha256(await readText(sourcePath)),
            construction_notes: "AI generation in Chinese from seed-derived matched task card.",
          });
          jobs.push({
            job_id: translateJobId,
            sample_id: id,
            case_id: "N3",
            job_type: "chat_completion",
            requires_api: true,
            dependency_job_ids: [genJobId],
            input_text_path: chinesePath,
            output_text_path: finalPath,
            prompt_template: promptForN3Translation("{{INPUT_TEXT}}", promptFamily.target),
            construction_notes: "AI translation of AI-generated Chinese text into English.",
          });
          sourceTextPath = chinesePath;
          seedLanguage = "zh";
          constructionNotes = "Pending AI Chinese generation and AI translation to English.";
          licenseNotes = "Synthetic AI-origin cross-lingual sample; model/provider metadata required.";
        } else if (caseConfig.case_id === "N4") {
          const n1Id = sampleId("N1", lengthBucket, index);
          const aiDraftPath = `texts/generated/final/${n1Id}.txt`;
          await writeRelative(sourcePath, promptForN4(taskCard));
          sourceTextPath = aiDraftPath;
          sampleStatus = "pending_human_edit";
          constructionNotes =
            "Pending human light-edit collection of the matched N1 AI-generated final text; no separate N4 AI draft is generated.";
          licenseNotes =
            "Matched N1 AI-origin draft with human light edits; model/provider metadata and participant/editor confirmation required.";
        }

        const finalAbsolutePath = path.join(DATA_DIR, finalPath);
        let finalWordCount = "";
        if (await exists(finalAbsolutePath)) {
          const finalText = await readFile(finalAbsolutePath, "utf8");
          finalWordCount = wordCount(finalText);
          const finalMeta = await readJsonIfExists(`${finalPath}.meta.json`);
          if (finalMeta?.generation_mode === "synthetic_proxy") {
            sampleStatus = "synthetic_proxy_ready";
            constructionNotes = `${constructionNotes} Final text currently comes from offline synthetic proxy generation and is not paper-ready.`;
            if (caseConfig.case_id === "C4") {
              originLabel = "synthetic_proxy_origin";
              policyLabel = "compliant_proxy";
            }
          } else if (caseConfig.case_id === "N4") {
            if (finalMeta?.generation_mode === "human_edited_ai_draft") {
              sampleStatus = "ready";
              constructionNotes =
                "Human light edit of AI-origin draft imported; private editor confirmation must be retained outside the public dataset.";
            } else {
              sampleStatus = "pending_human_edit";
              constructionNotes = `${constructionNotes} Final text exists but lacks human_edited_ai_draft metadata, so it is not paper-ready.`;
            }
          } else if (jobIds.length && !finalMeta?.input_text_sha256) {
            sampleStatus = "pending_generation";
            constructionNotes = `${constructionNotes} Existing final text lacks input hash metadata and is not accepted after the seed-aligned prompt redesign.`;
          } else {
            sampleStatus = "ready";
          }
        }

        rows.push({
          sample_id: id,
          case_id: caseConfig.case_id,
          case_name: caseConfig.case_name,
          matched_set_id: setId,
          prompt_id: promptFamily.prompt_id,
          task_type:
            caseConfig.case_id === "C3" && seed?.task_type
              ? seed.task_type
              : promptFamily.task_type,
          length_bucket: lengthBucket,
          seed_id: seed?.seed_id || "",
          seed_type: caseConfig.seed_type,
          seed_language: seedLanguage,
          seed_text_path: seedTextPath,
          policy_label: policyLabel,
          origin_label: originLabel,
          expected_document_class: caseConfig.expected_document_class,
          final_text_path: finalPath,
          source_text_path: sourceTextPath,
          construction_notes: constructionNotes,
          license_notes: licenseNotes,
          word_count: finalWordCount,
          sample_status: sampleStatus,
          generation_job_ids: jobIds.join(";"),
          approval_required: ["C4", "N4"].includes(caseConfig.case_id) ? "yes" : "no",
        });
      }
    }
  }

  const sampleColumns = [
    "sample_id",
    "case_id",
    "case_name",
    "matched_set_id",
    "prompt_id",
    "task_type",
    "length_bucket",
    "seed_id",
    "seed_type",
    "seed_language",
    "seed_text_path",
    "policy_label",
    "origin_label",
    "expected_document_class",
    "final_text_path",
    "source_text_path",
    "construction_notes",
    "license_notes",
    "word_count",
    "sample_status",
    "generation_job_ids",
    "approval_required",
  ];

  const sampleCsv = [
    sampleColumns.join(","),
    ...rows.map((row) =>
      sampleColumns.map((column) => csvEscape(row[column])).join(","),
    ),
  ].join("\n");
  await writeFile(GENERATED_SAMPLES_PATH, `${sampleCsv}\n`);

  const jsonl = jobs.map((job) => JSON.stringify(job)).join("\n");
  await writeFile(JOBS_PATH, `${jsonl}\n`);

  const statusCounts = rows.reduce((acc, row) => {
    acc[row.sample_status] = (acc[row.sample_status] || 0) + 1;
    return acc;
  }, {});
  const jobCounts = jobs.reduce((acc, job) => {
    acc[job.job_type] = (acc[job.job_type] || 0) + 1;
    return acc;
  }, {});
  console.log(`generated sample rows: ${rows.length}`);
  console.log(`sample status counts: ${JSON.stringify(statusCounts)}`);
  console.log(`generation jobs: ${jobs.length} ${JSON.stringify(jobCounts)}`);
  console.log(`wrote ${path.relative(process.cwd(), GENERATED_SAMPLES_PATH)}`);
  console.log(`wrote ${path.relative(process.cwd(), JOBS_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
