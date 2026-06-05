# 210-Row LLM Predictor Runbook

Date prepared: 2026-06-05

This run is for the non-N4 paper-ready samples only. The manifest is:

```text
data/detector-stress-test/samples-generated-ready.csv
```

It contains 210 rows:

- C1: 30
- C2: 30
- C3: 30
- C4: 30
- N1: 30
- N2: 30
- N3: 30

Do not use `samples-generated-proxy.csv` for this fork, because that file also
contains the 30 N4 synthetic proxy rows.

## Run

```bash
export OPENROUTER_API_KEY="$(security find-generic-password -s opennego.OPENROUTER_API_KEY -a opennego -w 2>/dev/null || true)"
LLM_DETECTOR_PROVIDER=openrouter \
LLM_DETECTOR_MODEL=anthropic/claude-opus-4.8 \
node data/detector-stress-test/scripts/run_llm_detector_baseline.mjs \
  --samples=data/detector-stress-test/samples-generated-ready.csv \
  --outputs=data/detector-stress-test/detector_outputs_openrouter_opus_4_8_ready_210.csv
```

## Aggregate

```bash
node data/detector-stress-test/scripts/aggregate_detector_outputs.mjs \
  --samples=data/detector-stress-test/samples-generated-ready.csv \
  --outputs=data/detector-stress-test/detector_outputs_openrouter_opus_4_8_ready_210.csv \
  --output=data/detector-stress-test/confusion_by_case_openrouter_opus_4_8_ready_210.csv
```

## Verify

Expected detector output rows: 210.

```bash
python3 - <<'PY'
import csv, collections
rows=list(csv.DictReader(open('data/detector-stress-test/detector_outputs_openrouter_opus_4_8_ready_210.csv')))
print('rows', len(rows))
print(collections.Counter(r['request_status'] for r in rows))
print(collections.Counter(r['case_id'] for r in csv.DictReader(open('data/detector-stress-test/samples-generated-ready.csv'))))
PY
```
