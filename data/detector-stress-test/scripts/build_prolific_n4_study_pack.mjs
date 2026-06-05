#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(DATA_DIR, "n4-human-edit-manifest.csv");
const OUTPUT_DIR = path.join(DATA_DIR, "prolific");
const ITEMS_PATH = path.join(OUTPUT_DIR, "n4-editing-items.csv");
const BUDGET_CSV_PATH = path.join(OUTPUT_DIR, "n4-editing-budget-estimate.csv");
const PLAN_PATH = path.join(OUTPUT_DIR, "n4-editing-study-plan.md");
const INSTRUCTIONS_PATH = path.join(OUTPUT_DIR, "n4-editing-worker-instructions.html");

const CHECKED_DATE = "2026-06-05";

const LENGTH_CONFIG = {
  short: {
    target_minutes: 8,
    recommended_reward_usd: 1.6,
    minimum_reward_usd: 1.07,
    participant_count: 10,
  },
  medium: {
    target_minutes: 18,
    recommended_reward_usd: 3.6,
    minimum_reward_usd: 2.4,
    participant_count: 10,
  },
  long: {
    target_minutes: 50,
    recommended_reward_usd: 10.0,
    minimum_reward_usd: 6.67,
    participant_count: 10,
  },
};

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

async function writeCsv(filePath, rows, columns) {
  await writeFile(
    filePath,
    `${[columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join(
      "\n",
    )}\n`,
  );
}

async function readRelativeIfExists(relativePath) {
  try {
    return (await readFile(path.join(DATA_DIR, relativePath), "utf8")).trim();
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

function taskLabel(taskType) {
  if (taskType === "paper_review") return "Conference paper review";
  if (taskType === "student_assignment_response") return "Student assignment response";
  return "Social media post";
}

function usd(value) {
  return Number(value).toFixed(2);
}

const manifestRows = parseCsv(await readFile(MANIFEST_PATH, "utf8"));
const itemRows = [];
for (const row of manifestRows) {
  const config = LENGTH_CONFIG[row.length_bucket];
  itemRows.push({
    sample_id: row.sample_id,
    study_arm: `n4_${row.length_bucket}`,
    task_title: `${taskLabel(row.task_type)} light edit (${row.sample_id})`,
    length_bucket: row.length_bucket,
    task_type: row.task_type,
    target_min_words: row.target_min_words,
    target_max_words: row.target_max_words,
    estimated_minutes: config.target_minutes,
    recommended_reward_usd: usd(config.recommended_reward_usd),
    minimum_reward_usd: usd(config.minimum_reward_usd),
    ai_prompt_path: row.ai_prompt_path,
    ai_draft_path: row.ai_draft_path,
    editor_input_path: row.editor_input_path,
    final_text_path: row.final_text_path,
    collection_mode: "prolific_ai_draft_light_edit",
    response_field_name: `edited_text_${row.sample_id}`,
    editing_instruction:
      "Lightly edit the AI draft for clarity and local flow. Keep the main ideas, examples, and structure. Do not rewrite from scratch.",
    ai_prompt_text: await readRelativeIfExists(row.ai_prompt_path),
    ai_draft_text: await readRelativeIfExists(row.ai_draft_path),
    completion_code_policy: "Use Prolific completion/submission status or the external survey completion code.",
    META_case_id: row.case_id,
    META_prompt_id: row.prompt_id,
    META_matched_set_id: row.matched_set_id,
  });
}

const budgetRows = Object.entries(LENGTH_CONFIG).map(([lengthBucket, config]) => {
  const participantRewardRecommended = config.participant_count * config.recommended_reward_usd;
  const participantRewardMinimum = config.participant_count * config.minimum_reward_usd;
  return {
    checked_date: CHECKED_DATE,
    length_bucket: lengthBucket,
    participant_count: config.participant_count,
    estimated_minutes_each: config.target_minutes,
    recommended_reward_usd_each: usd(config.recommended_reward_usd),
    minimum_reward_usd_each: usd(config.minimum_reward_usd),
    participant_rewards_recommended_usd: usd(participantRewardRecommended),
    participant_rewards_minimum_usd: usd(participantRewardMinimum),
    academic_total_recommended_usd: usd(participantRewardRecommended * 1.333),
    corporate_total_recommended_usd: usd(participantRewardRecommended * 1.428),
    academic_total_minimum_usd: usd(participantRewardMinimum * 1.333),
    corporate_total_minimum_usd: usd(participantRewardMinimum * 1.428),
  };
});

const totalRecommendedRewards = budgetRows.reduce(
  (sum, row) => sum + Number(row.participant_rewards_recommended_usd),
  0,
);
const totalMinimumRewards = budgetRows.reduce((sum, row) => sum + Number(row.participant_rewards_minimum_usd), 0);

await mkdir(OUTPUT_DIR, { recursive: true });
await writeCsv(ITEMS_PATH, itemRows, [
  "sample_id",
  "study_arm",
  "task_title",
  "length_bucket",
  "task_type",
  "target_min_words",
  "target_max_words",
  "estimated_minutes",
  "recommended_reward_usd",
  "minimum_reward_usd",
  "ai_prompt_path",
  "ai_draft_path",
  "editor_input_path",
  "final_text_path",
  "collection_mode",
  "response_field_name",
  "editing_instruction",
  "ai_prompt_text",
  "ai_draft_text",
  "completion_code_policy",
  "META_case_id",
  "META_prompt_id",
  "META_matched_set_id",
]);

await writeCsv(BUDGET_CSV_PATH, budgetRows, [
  "checked_date",
  "length_bucket",
  "participant_count",
  "estimated_minutes_each",
  "recommended_reward_usd_each",
  "minimum_reward_usd_each",
  "participant_rewards_recommended_usd",
  "participant_rewards_minimum_usd",
  "academic_total_recommended_usd",
  "corporate_total_recommended_usd",
  "academic_total_minimum_usd",
  "corporate_total_minimum_usd",
]);

await writeFile(
  INSTRUCTIONS_PATH,
  `<h1>Human Editing Task</h1>
<p>You will edit one AI-generated draft. The goal is to collect examples where AI supplied the substantive draft and a person made light local improvements.</p>
<p>Please do not use ChatGPT, Claude, Gemini, AI rewriting tools, humanizer tools, machine translation, or any other text-generation system while completing this task.</p>
<p>Keep the main ideas, examples, structure, and overall meaning from the draft. Make local edits for clarity, grammar, repetition, flow, and awkward wording. Do not rewrite the response from scratch and do not add major new arguments or facts.</p>
<p>Your edited response should stay close to the word range shown in the task. We may reject submissions that are empty, copied from another source, generated with additional AI tools, or completely rewritten into a different response.</p>
<p>At the end, submit the study and enter the completion code if one is shown.</p>
<p>By submitting, you confirm that you edited the draft yourself without using additional AI generation and that the research team may use the de-identified edited text for research on writing authenticity.</p>
`,
);

await writeFile(
  PLAN_PATH,
  `# Prolific N4 Editing Study Pack

Checked: ${CHECKED_DATE}

Purpose: collect the 30 N4 human-edited AI-draft samples through Prolific or a
linked survey. N4 is a non-compliant false-negative-risk case: the final text is
mixed-AI-origin because AI supplied the substantive draft, even though a human
later made light local edits.

## Generated Files

- \`prolific/n4-editing-items.csv\`: one row per required N4 edit sample,
  including visible task prompt text and AI draft text.
- \`prolific/n4-editing-budget-estimate.csv\`: rough reward and platform-fee
  estimate by length bucket.
- \`prolific/n4-editing-worker-instructions.html\`: draft worker-facing
  instructions for a Prolific external-link study.

## Recommended Study Design

- Use Prolific as recruitment/payment layer.
- Collect edits through a Prolific text field or linked survey text field.
- Run three separate quota arms:
  - short: 10 participants, one 120-180 word social post draft edit each.
  - medium: 10 participants, one 400-600 word student-response draft edit each.
  - long: 10 participants, one 1000-1500 word paper-review draft edit each.
- Assign one sample id per participant. Do not ask one participant to edit
  multiple N4 samples unless we explicitly decide to trade editor diversity for
  cost.
- Export final edited texts into \`texts/human_n4_edits/<sample_id>.txt\`, then
  run the N4 importer.

This is sufficient for the final-text detector false-negative experiment,
because the compared systems only see the final text. It should not be
described as Humanly process evidence.

## Budget Estimate

Using Prolific's public guidance of a recommended $12/hour rate and an $8/hour
minimum, plus public platform-fee rates:

- Recommended participant rewards: $${usd(totalRecommendedRewards)}
- Recommended academic/non-profit total with 33.3% fee: $${usd(totalRecommendedRewards * 1.333)}
- Recommended corporate total with 42.8% fee: $${usd(totalRecommendedRewards * 1.428)}
- Minimum participant rewards: $${usd(totalMinimumRewards)}
- Minimum academic/non-profit total with 33.3% fee: $${usd(totalMinimumRewards * 1.333)}
- Minimum corporate total with 42.8% fee: $${usd(totalMinimumRewards * 1.428)}

These figures exclude VAT and any extra payments for revisions, replacement
participants, or bonuses.

## Prolific Sources

- Prolific pricing/help states that researchers pay participant rewards plus a
  platform fee, currently 33.3% for academic/non-profit and 42.8% for corporate
  customers.
- Prolific public guidance recommends at least $12/hour and allows an absolute
  minimum of $8/hour.

Source URLs:

- https://researcher-help.prolific.com/en/articles/445239-what-is-your-pricing
- https://www.prolific.com/pricing

## Decisions Needed Before Launch

- Confirm whether N4 will be collected inside Prolific or through an external
  survey form linked from Prolific.
- Confirm that the live AI drafts are approved before worker editing starts.
- Confirm Prolific workspace/project, study currency, and whether we qualify for
  academic/non-profit platform fees.
- Confirm reward levels, especially the long editing task duration and reward.
- Confirm consent language and whether de-identified edited text can be stored
  in this repository.
- Confirm the export format that maps each response back to \`sample_id\`.
`,
);

console.log(`Prolific N4 editing item rows: ${itemRows.length}`);
console.log(`wrote ${path.relative(process.cwd(), ITEMS_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), BUDGET_CSV_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), PLAN_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), INSTRUCTIONS_PATH)}`);
