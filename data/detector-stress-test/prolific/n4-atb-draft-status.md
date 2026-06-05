# N4 Prolific Draft Status

Created: 2026-06-05  
Participant-facing update: 2026-06-05

Workspace: `6908d8f4e12fe1baa26bec1c`  
Project: `6908d9912e9daef7ce2f6889`

All studies are **UNPUBLISHED** drafts. No participant recruitment has started.
The workspace balance was still `$823.86` after draft creation, so creating the
drafts did not deduct funds.

The same three draft study IDs were updated in place to use replacement batches
with participant-facing names and simplified task display. The visible left-side
task data now contains only one field: `ai_draft_to_edit`. All sample mapping
fields are stored as `META_` metadata.

## Draft Studies

| Arm | Participant-facing study name | Study ID | Current batch ID | Dataset rows | Batch tasks | Task groups | Places | Reward | Prolific total cost |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| short | Lightly edit a short AI-written draft | `6a233d71c5d393fbc762e3f7` | `019e99b1-d894-714d-b692-1037f2459ae1` | 10 | 10 | 10 | 10 | $1.60 | $21.33 |
| medium | Lightly edit a medium-length AI-written draft | `6a233d8eecaffc2bbd69bc85` | `019e99b2-9d4d-776f-a7b9-32e1259254a8` | 10 | 10 | 10 | 10 | $3.60 | $48.00 |
| long | Lightly edit a long AI-written draft | `6a233d9b2269b8ab2047272c` | `019e99b2-d8ac-7560-bd99-86b084e13502` | 10 | 10 | 10 | 10 | $10.00 | $133.33 |

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
- `estimated_reward_per_hour`: `$12.00`
- `minimum_reward_per_hour`: `$8.00`

If all three drafts are published, the quoted total is:

| Component | Amount |
| --- | ---: |
| Participant rewards | $152.00 |
| Platform fees | $50.66 |
| VAT | $0.00 |
| Total quoted cost | $202.66 |

The previous hand calculation was `$202.62`; the 4-cent difference comes from
Prolific rounding each draft study independently.

## ID Files

- `n4-atb-short-created-ids.json`
- `n4-atb-medium-created-ids.json`
- `n4-atb-long-created-ids.json`

Use `n4-atb-runbook.md` for the launch, result pull, report normalization, and
N4 import commands.
