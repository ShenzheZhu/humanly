#!/usr/bin/env node

import fs from 'node:fs/promises';
import {
  addCheck,
  arg,
  boolArg,
  createQaRun,
  exitForReport,
  fetchJson,
  intArg,
  joinUrl,
  printReportLocation,
  runCheck,
  writeReport,
} from './lib/qa-report.mjs';

const PROVIDERS = {
  together: {
    baseUrl: 'https://api.together.xyz/v1',
    keyEnv: 'TOGETHER_API_KEY',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
    extraHeaders: {
      'HTTP-Referer': 'https://app.writehumanly.net',
      'X-Title': 'Humanly QA Harness',
    },
  },
};

function showHelp() {
  console.log(`Humanly AI usage harness

Usage:
  pnpm qa:ai:usage
  QA_AI_EXECUTE=1 QA_AI_PROVIDER=together QA_AI_MODEL=moonshotai/Kimi-K2.6 TOGETHER_API_KEY=... pnpm qa:ai:usage

Environment / flags:
  QA_AI_EXECUTE=1 / --execute          Run live provider checks. Default is plan-only.
  QA_AI_PROVIDER / --provider          together | openrouter
  QA_AI_MODEL / --model                Provider model id for smoke checks
  QA_AI_MODELS / --models              Comma-separated provider model ids
  QA_AI_API_KEY                        Overrides provider-specific key env
  QA_AI_BASE_URL / --base-url          OpenAI-compatible provider base URL
  QA_AI_MANIFEST / --manifest          Matrix manifest path
  QA_AI_DOCUMENTS / --documents        Comma-separated manifest document ids
  QA_AI_QUERY_TYPES / --query-types    Comma-separated manifest query ids
  QA_AI_TEXT_MAX_TOKENS                Text smoke max_tokens (default 1024)
  QA_AI_TOOL_MAX_TOKENS                Tool smoke max_tokens (default 2048)
  QA_OUTPUT_DIR / --output-dir         Report output directory

This skeleton establishes the report/command shape. Full Humanly document x
model x query matrices should extend this command rather than creating new
one-off scripts.
`);
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

const execute = boolArg('execute', 'QA_AI_EXECUTE', false);
const providerName = arg('provider', process.env.QA_AI_PROVIDER || 'together');
const provider = PROVIDERS[providerName];
const model = arg('model', process.env.QA_AI_MODEL);
const models = parseList(arg('models', process.env.QA_AI_MODELS)) || (model ? [model] : []);
const baseUrl = arg('base-url', process.env.QA_AI_BASE_URL || provider?.baseUrl);
const manifestPath = arg('manifest', process.env.QA_AI_MANIFEST || 'fixtures/qa/ai-usage/manifest.json');
const apiKey = process.env.QA_AI_API_KEY || (provider ? process.env[provider.keyEnv] : undefined);
const documentFilter = parseSet(arg('documents', process.env.QA_AI_DOCUMENTS));
const queryTypeFilter = parseSet(arg('query-types', process.env.QA_AI_QUERY_TYPES));
const textMaxTokens = intArg('text-max-tokens', 'QA_AI_TEXT_MAX_TOKENS', 1024);
const toolMaxTokens = intArg('tool-max-tokens', 'QA_AI_TOOL_MAX_TOKENS', 2048);

const PSEUDO_TOOL_MARKUP = /(<\s*tool_(?:call|use)s?\b|<\s*function\b|<\s*parameter\b|<[^>]*DSML|tool_calls>|<\/[^>]*invoke>|"function"\s*:\s*"[^"]+"\s*,\s*"arguments")/i;

function parseList(value) {
  const parsed = String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : null;
}

function parseSet(value) {
  const parsed = parseList(value);
  return parsed ? new Set(parsed) : null;
}

function selected(items, filter) {
  if (!filter) return items || [];
  return (items || []).filter((item) => filter.has(item.id));
}

function expandMatrix(manifest, modelIds) {
  const documents = selected(manifest.documents, documentFilter);
  const queryTypes = selected(manifest.queryTypes, queryTypeFilter);
  const effectiveModels =
    modelIds.length > 0
      ? modelIds
      : (manifest.modelGroups || []).flatMap((group) => group.examples || []);
  return effectiveModels.flatMap((modelId) =>
    documents.flatMap((document) =>
      queryTypes.map((queryType) => ({
        model: modelId,
        document: document.id,
        queryType: queryType.id,
      })),
    ),
  );
}

const report = createQaRun({
  layer: 'ai-usage',
  title: 'AI Usage Harness',
  config: {
    execute,
    provider: providerName,
    models,
    baseUrl,
    manifestPath,
    hasApiKey: Boolean(apiKey),
    documentFilter: documentFilter ? [...documentFilter] : undefined,
    queryTypeFilter: queryTypeFilter ? [...queryTypeFilter] : undefined,
    textMaxTokens,
    toolMaxTokens,
  },
});

let manifest = null;

await runCheck(
  report,
  {
    id: 'manifest-load',
    title: 'AI usage matrix manifest loads',
    target: manifestPath,
  },
  async () => {
    const raw = await fs.readFile(manifestPath, 'utf8');
    manifest = JSON.parse(raw);
    const dimensions = {
      documents: manifest.documents?.length || 0,
      queryTypes: manifest.queryTypes?.length || 0,
      modelGroups: manifest.modelGroups?.length || 0,
      requiredSignals: manifest.requiredSignals?.length || 0,
    };
    if (dimensions.documents === 0 || dimensions.queryTypes === 0 || dimensions.requiredSignals === 0) {
      throw new Error('Manifest must include documents, queryTypes, and requiredSignals.');
    }
    return { details: dimensions };
  },
);

await runCheck(
  report,
  {
    id: 'matrix-plan',
    title: 'Humanly AI usage matrix can be expanded',
    target: manifestPath,
  },
  async () => {
    if (!manifest) {
      throw new Error('Manifest was not loaded.');
    }
    const rows = expandMatrix(manifest, models);
    if (rows.length === 0) {
      throw new Error('Matrix expansion produced zero rows.');
    }
    const byDocument = {};
    const byQueryType = {};
    const byModel = {};
    for (const row of rows) {
      byDocument[row.document] = (byDocument[row.document] || 0) + 1;
      byQueryType[row.queryType] = (byQueryType[row.queryType] || 0) + 1;
      byModel[row.model] = (byModel[row.model] || 0) + 1;
    }
    return {
      details: {
        rows: rows.length,
        modelCount: Object.keys(byModel).length,
        documentCount: Object.keys(byDocument).length,
        queryTypeCount: Object.keys(byQueryType).length,
        sampleRows: rows.slice(0, 8),
      },
    };
  },
);

if (!execute) {
  addCheck(report, {
    id: 'provider-smoke',
    title: 'Live provider text/tool smoke',
    target: providerName,
    status: 'skip',
    details: {
      reason: 'Set QA_AI_EXECUTE=1 plus provider/model/key env to run live checks.',
    },
  });
} else {
  if (!provider && !baseUrl) {
    addCheck(report, {
      id: 'provider-config',
      title: 'Provider configuration is supported',
      target: providerName,
      status: 'fail',
      critical: true,
      error: `Unknown provider ${providerName}; pass --base-url for a custom OpenAI-compatible endpoint.`,
    });
  } else if (models.length === 0 || !apiKey || !baseUrl) {
    addCheck(report, {
      id: 'provider-config',
      title: 'Provider credentials are present',
      target: providerName,
      status: 'fail',
      critical: true,
      details: {
        modelCount: models.length,
        hasApiKey: Boolean(apiKey),
        hasBaseUrl: Boolean(baseUrl),
      },
    });
  } else {
    for (const modelId of models) {
      await runCheck(
        report,
        {
          id: `provider-text:${modelId}`,
          title: 'Live provider returns bounded text without tool markup leaks',
          target: `${providerName}:${modelId}`,
        },
        async () => {
          const { response, body } = await fetchJson(joinUrl(baseUrl, '/chat/completions'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              ...(provider?.extraHeaders || {}),
            },
            body: JSON.stringify({
              model: modelId,
              messages: [
                {
                  role: 'user',
                  content: 'Reply with exactly one short sentence confirming that this is a Humanly QA smoke test.',
                },
              ],
              max_tokens: textMaxTokens,
              temperature: 0,
            }),
          });
          const message = body?.choices?.[0]?.message || {};
          const content = String(message.content || '');
          const reasoning = message.reasoning || message.reasoning_content || '';
          if (response.status !== 200 || !content.trim()) {
            const finishReason = body?.choices?.[0]?.finish_reason || body?.choices?.[0]?.native_finish_reason;
            const reasoningTokens = body?.usage?.completion_tokens_details?.reasoning_tokens;
            throw new Error(
              `Expected non-empty completion, got ${response.status}; finish=${finishReason || 'unknown'}; reasoningTokens=${reasoningTokens ?? 'unknown'}; textMaxTokens=${textMaxTokens}`,
            );
          }
          if (PSEUDO_TOOL_MARKUP.test(content)) {
            throw new Error('Text response leaked pseudo-tool markup.');
          }
          return {
            details: {
              status: response.status,
              contentPreview: content.trim().slice(0, 160),
              hasReasoning: Boolean(reasoning),
            },
          };
        },
      );

      await runCheck(
        report,
        {
          id: `provider-tool:${modelId}`,
          title: 'Live provider accepts OpenAI-compatible tool schema',
          target: `${providerName}:${modelId}`,
        },
        async () => {
          const { response, body } = await fetchJson(joinUrl(baseUrl, '/chat/completions'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              ...(provider?.extraHeaders || {}),
            },
            body: JSON.stringify({
              model: modelId,
              messages: [
                {
                  role: 'user',
                  content: 'Use the tool to report the word humanly.',
                },
              ],
              tools: [
                {
                  type: 'function',
                  function: {
                    name: 'report_word',
                    description: 'Report one requested word for provider tool-call compatibility smoke tests.',
                    parameters: {
                      type: 'object',
                      properties: {
                        word: { type: 'string' },
                      },
                      required: ['word'],
                    },
                  },
                },
              ],
              tool_choice: 'auto',
              max_tokens: toolMaxTokens,
              temperature: 0,
            }),
          });
          const message = body?.choices?.[0]?.message || {};
          const toolCalls = message.tool_calls || [];
          const content = String(message.content || '');
          if (response.status !== 200 || toolCalls.length === 0) {
            throw new Error(`Expected at least one tool call, got ${response.status}`);
          }
          if (PSEUDO_TOOL_MARKUP.test(content)) {
            throw new Error('Tool response content leaked pseudo-tool markup.');
          }
          return {
            details: {
              status: response.status,
              toolCallCount: toolCalls.length,
              firstToolName: toolCalls[0]?.function?.name || null,
              contentPreview: content.trim().slice(0, 160),
            },
          };
        },
      );
    }
  }
}

await writeReport(report);
printReportLocation(report);
exitForReport(report);
