# N4 Prolific Draft Status

Created: 2026-06-05  
Participant-facing update: 2026-06-05

Workspace: `6908d8f4e12fe1baa26bec1c`  
Project: `6908d9912e9daef7ce2f6889`

The short study is **ACTIVE** after the project owner published it in Prolific.
The medium and long studies are still **UNPUBLISHED** drafts.

The same three draft study IDs were updated in place to use replacement batches
with participant-facing names and simplified task display. The visible left-side
task data now contains only one field: `Draft`. All sample mapping
fields are stored as `META_` metadata.

## Studies

| Arm | Status | Participant-facing study name | Study ID | Current batch ID | Dataset rows | Batch tasks | Task groups | Places | Reward | Prolific total cost |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| short | ACTIVE | Lightly edit a short AI-written draft | `6a233d71c5d393fbc762e3f7` | `019e99b9-5522-7345-8b55-5ce20a7f419f` | 10 | 10 | 10 | 10 | $2.50 | $33.33 |
| medium | UNPUBLISHED | Lightly edit a medium-length AI-written draft | `6a233d8eecaffc2bbd69bc85` | `019e99b9-8af7-776b-ac51-92100004b740` | 10 | 10 | 10 | 10 | $3.60 | $48.00 |
| long | UNPUBLISHED | Lightly edit a long AI-written draft | `6a233d9b2269b8ab2047272c` | `019e99b9-b5df-7650-8053-21445e034a79` | 10 | 10 | 10 | 10 | $10.00 | $133.33 |

## Screener / Eligibility Settings

The medium and long drafts were rechecked against the active short study and
patched to match these settings:

- `filters`: `structured-writing` score 70-100 and `ai-taskers=0`.
- `submissions_config`: one submission per participant and auto-reject
  `EXCEPTIONALLY_FAST`.
- `study_labels`: `ai_annotation`.
- `data_collection_metadata`: `annotators_per_task=1`,
  `total_task_groups=10`.

The matching was verified through the Prolific API on 2026-06-05. Medium and
long remain unpublished and ready to publish.

## Participant Task Wording

Right-side free-text prompt:

> First copy the draft from the left, then make your edits, then submit.

Helper text:

> Your answer should start from the draft shown on the left. Copy it into this
> box, make light edits for clarity and flow, and submit only the edited text.

## Cost

Prolific returned these study fields:

- `fees_percentage`: `0.333333`
- `vat_percentage`: `0.0`
- short `estimated_reward_per_hour`: `$30.00`
- medium and long `estimated_reward_per_hour`: `$12.00`
- `minimum_reward_per_hour`: `$8.00`

The current configured total across short/medium/long is:

| Component | Amount |
| --- | ---: |
| Participant rewards | $161.00 |
| Platform fees | $53.66 |
| VAT | $0.00 |
| Total quoted cost | $214.66 |

The remaining unpublished medium+long studies together quote `$181.33`.

## ID Files

- `n4-atb-short-created-ids.json`
- `n4-atb-medium-created-ids.json`
- `n4-atb-long-created-ids.json`

Use `n4-atb-runbook.md` for the launch, result pull, report normalization, and
N4 import commands.
