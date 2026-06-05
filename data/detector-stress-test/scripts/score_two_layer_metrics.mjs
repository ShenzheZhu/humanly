#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const SAMPLES_PATH = path.resolve(
  process.cwd(),
  getArg("samples", path.join(DATA_DIR, "samples-generated-ready.csv")),
);
const OUTPUTS_PATH = path.resolve(
  process.cwd(),
  getArg("outputs", path.join(DATA_DIR, "detector_outputs_openrouter_opus_4_8_ready_210.csv")),
);
const OUT_PREFIX = path.resolve(
  process.cwd(),
  getArg("out-prefix", path.join(DATA_DIR, "two_layer_openrouter_opus_4_8_ready_210")),
);

const DOCUMENT_BY_CASE_PATH = `${OUT_PREFIX}_document_by_case.csv`;
const DOCUMENT_CONFUSION_PATH = `${OUT_PREFIX}_document_confusion.csv`;
const POLICY_BY_CASE_PATH = `${OUT_PREFIX}_policy_by_case.csv`;
const SUMMARY_PATH = `${OUT_PREFIX}_summary.md`;

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
    if (!quoted && char === "\r") {
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
    `${[
      columns.join(","),
      ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
    ].join("\n")}\n`,
  );
}

function rate(numerator, denominator) {
  return denominator ? (numerator / denominator).toFixed(4) : "";
}

function expectedPolicyPrediction(sample) {
  return sample.policy_label === "non_compliant" ? "ai_suspicious" : "human_compliant";
}

function policyCell(sample, output) {
  const expected = expectedPolicyPrediction(sample);
  const predicted = output.binary_prediction;
  if (expected === "ai_suspicious" && predicted === "ai_suspicious") return "TP";
  if (expected === "ai_suspicious" && predicted === "human_compliant") return "FN";
  if (expected === "human_compliant" && predicted === "human_compliant") return "TN";
  return "FP";
}

function groupKey(sample) {
  return `${sample.case_id}::${sample.length_bucket}`;
}

function makeDocumentGroup(sample) {
  return {
    case_id: sample.case_id,
    case_name: sample.case_name,
    length_bucket: sample.length_bucket,
    expected_document_class: sample.expected_document_class,
    n: 0,
    correct: 0,
    incorrect: 0,
    predicted_HUMAN_ONLY: 0,
    predicted_MIXED: 0,
    predicted_AI_ONLY: 0,
    accuracy: "",
  };
}

function makePolicyGroup(sample) {
  return {
    case_id: sample.case_id,
    case_name: sample.case_name,
    length_bucket: sample.length_bucket,
    policy_label: sample.policy_label,
    n: 0,
    TP: 0,
    FP: 0,
    TN: 0,
    FN: 0,
    accuracy: "",
    TPR: "",
    FPR: "",
    TNR: "",
    FNR: "",
  };
}

const samples = parseCsv(await readFile(SAMPLES_PATH, "utf8"));
const outputs = parseCsv(await readFile(OUTPUTS_PATH, "utf8"));
const outputsBySampleId = new Map(outputs.map((row) => [row.sample_id, row]));

const detectorNames = [...new Set(outputs.map((row) => row.detector).filter(Boolean))];
if (detectorNames.length !== 1) {
  throw new Error(`Expected one detector in ${OUTPUTS_PATH}; found ${detectorNames.join(", ") || "none"}`);
}
const detector = detectorNames[0];

const documentGroups = new Map();
const policyGroups = new Map();
const documentConfusion = new Map();
const summary = {
  total: samples.length,
  success: 0,
  missing: 0,
  request_errors: 0,
  document_correct: 0,
  policy_correct: 0,
  TP: 0,
  FP: 0,
  TN: 0,
  FN: 0,
};

for (const sample of samples) {
  const output = outputsBySampleId.get(sample.sample_id);
  if (!output) {
    summary.missing += 1;
    continue;
  }
  if (output.request_status !== "success") {
    summary.request_errors += 1;
    continue;
  }

  summary.success += 1;

  const docKey = groupKey(sample);
  if (!documentGroups.has(docKey)) documentGroups.set(docKey, makeDocumentGroup(sample));
  const docGroup = documentGroups.get(docKey);
  const predictedDocumentClass = output.canonical_document_class || output.raw_label;
  const expectedDocumentClass = sample.expected_document_class;
  docGroup.n += 1;
  docGroup[`predicted_${predictedDocumentClass}`] = (docGroup[`predicted_${predictedDocumentClass}`] || 0) + 1;
  if (predictedDocumentClass === expectedDocumentClass) {
    docGroup.correct += 1;
    summary.document_correct += 1;
  } else {
    docGroup.incorrect += 1;
  }

  const confusionKey = `${expectedDocumentClass}::${predictedDocumentClass}`;
  documentConfusion.set(confusionKey, {
    expected_document_class: expectedDocumentClass,
    predicted_document_class: predictedDocumentClass,
    n: (documentConfusion.get(confusionKey)?.n || 0) + 1,
  });

  const policyKey = groupKey(sample);
  if (!policyGroups.has(policyKey)) policyGroups.set(policyKey, makePolicyGroup(sample));
  const policyGroup = policyGroups.get(policyKey);
  const cell = policyCell(sample, output);
  policyGroup.n += 1;
  policyGroup[cell] += 1;
  summary[cell] += 1;
  if (cell === "TP" || cell === "TN") summary.policy_correct += 1;
}

const documentRows = [...documentGroups.values()]
  .sort((left, right) => left.case_id.localeCompare(right.case_id) || left.length_bucket.localeCompare(right.length_bucket))
  .map((row) => ({
    ...row,
    accuracy: rate(row.correct, row.n),
  }));

const policyRows = [...policyGroups.values()]
  .sort((left, right) => left.case_id.localeCompare(right.case_id) || left.length_bucket.localeCompare(right.length_bucket))
  .map((row) => {
    const positive = row.TP + row.FN;
    const negative = row.TN + row.FP;
    return {
      ...row,
      accuracy: rate(row.TP + row.TN, row.n),
      TPR: rate(row.TP, positive),
      FPR: rate(row.FP, negative),
      TNR: rate(row.TN, negative),
      FNR: rate(row.FN, positive),
    };
  });

const documentConfusionRows = [...documentConfusion.values()].sort(
  (left, right) =>
    left.expected_document_class.localeCompare(right.expected_document_class) ||
    left.predicted_document_class.localeCompare(right.predicted_document_class),
);

const positive = summary.TP + summary.FN;
const negative = summary.TN + summary.FP;

await writeCsv(DOCUMENT_BY_CASE_PATH, documentRows, [
  "case_id",
  "case_name",
  "length_bucket",
  "expected_document_class",
  "n",
  "correct",
  "incorrect",
  "accuracy",
  "predicted_HUMAN_ONLY",
  "predicted_MIXED",
  "predicted_AI_ONLY",
]);

await writeCsv(DOCUMENT_CONFUSION_PATH, documentConfusionRows, [
  "expected_document_class",
  "predicted_document_class",
  "n",
]);

await writeCsv(POLICY_BY_CASE_PATH, policyRows, [
  "case_id",
  "case_name",
  "length_bucket",
  "policy_label",
  "n",
  "TP",
  "FP",
  "TN",
  "FN",
  "accuracy",
  "TPR",
  "FPR",
  "TNR",
  "FNR",
]);

const summaryMarkdown = `# Two-Layer Metric Summary

Generated: ${new Date().toISOString()}

Detector: \`${detector}\`

Samples: \`${path.relative(process.cwd(), SAMPLES_PATH)}\`

Outputs: \`${path.relative(process.cwd(), OUTPUTS_PATH)}\`

## Input Coverage

| Item | Count |
| --- | ---: |
| Sample rows | ${summary.total} |
| Successful detector rows | ${summary.success} |
| Missing detector rows | ${summary.missing} |
| Request errors | ${summary.request_errors} |

## Layer 1: Final-Text Document Class

Layer 1 compares the detector's three-class final-text judgment against
\`expected_document_class\`: \`HUMAN_ONLY\`, \`MIXED\`, or \`AI_ONLY\`.

| Metric | Value |
| --- | ---: |
| Correct | ${summary.document_correct} |
| Incorrect | ${summary.success - summary.document_correct} |
| Accuracy | ${rate(summary.document_correct, summary.success)} |

## Layer 2: Policy Compliance

Layer 2 maps detector output into policy evidence:
\`HUMAN_ONLY -> human_compliant\`; \`MIXED\` or \`AI_ONLY -> ai_suspicious\`.
It then compares against \`policy_label\` under the benchmark policy where AI
polish and translation are allowed, but substantive AI generation is not.

| Metric | Value |
| --- | ---: |
| TP | ${summary.TP} |
| FP | ${summary.FP} |
| TN | ${summary.TN} |
| FN | ${summary.FN} |
| Accuracy | ${rate(summary.policy_correct, summary.success)} |
| TPR | ${rate(summary.TP, positive)} |
| FNR | ${rate(summary.FN, positive)} |
| TNR | ${rate(summary.TN, negative)} |
| FPR | ${rate(summary.FP, negative)} |

## Output Files

- \`${path.relative(process.cwd(), DOCUMENT_BY_CASE_PATH)}\`
- \`${path.relative(process.cwd(), DOCUMENT_CONFUSION_PATH)}\`
- \`${path.relative(process.cwd(), POLICY_BY_CASE_PATH)}\`
`;

await writeFile(SUMMARY_PATH, summaryMarkdown);

console.log(`samples: ${summary.total}`);
console.log(`successful detector rows: ${summary.success}`);
console.log(`layer1 document accuracy: ${rate(summary.document_correct, summary.success)}`);
console.log(`layer2 policy accuracy: ${rate(summary.policy_correct, summary.success)}`);
console.log(`layer2 TP/FP/TN/FN: ${summary.TP}/${summary.FP}/${summary.TN}/${summary.FN}`);
console.log(`wrote ${path.relative(process.cwd(), SUMMARY_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), DOCUMENT_BY_CASE_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), DOCUMENT_CONFUSION_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), POLICY_BY_CASE_PATH)}`);
