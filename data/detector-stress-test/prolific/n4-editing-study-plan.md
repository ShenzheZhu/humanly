# Prolific N4 Editing Study Pack

Checked: 2026-06-05

Purpose: collect the 30 N4 human-edited AI-draft samples through Prolific or a
linked survey. N4 is a non-compliant false-negative-risk case: the final text is
mixed-AI-origin because AI supplied the substantive draft, even though a human
later made light local edits.

## Generated Files

- `prolific/n4-editing-items.csv`: one row per required N4 edit sample,
  including visible task prompt text and AI draft text.
- `prolific/n4-editing-budget-estimate.csv`: rough reward and platform-fee
  estimate by length bucket.
- `prolific/n4-editing-worker-instructions.html`: draft worker-facing
  instructions for a Prolific external-link study.
- `prolific/n4-atb-{short,medium,long}-items.csv`: AI Task Builder Batch
  dataset CSVs, one row per task and one task per participant.
- `prolific/n4-atb-{short,medium,long}-payloads.json`: payload templates for
  creating unpublished Prolific draft studies.

## Recommended Study Design

- Use Prolific AI Task Builder Batch as the recruitment, task, and payment
  layer.
- Run three separate quota arms:
  - short: 10 participants, one 120-180 word social post draft edit each.
  - medium: 10 participants, one 400-600 word student-response draft edit each.
  - long: 10 participants, one 1000-1500 word paper-review draft edit each.
- Assign one sample id per participant. Do not ask one participant to edit
  multiple N4 samples unless we explicitly decide to trade editor diversity for
  cost.
- Export final edited texts into `texts/human_n4_edits/<sample_id>.txt`, then
  run the N4 importer.
- In the ATB setup, each CSV row uses `META_TASK_GROUP_ID=<sample_id>`,
  `tasks_per_group=1`, and `annotators_per_task=1`, so the expected place
  count is 10 for each length-specific draft study.

This is sufficient for the final-text detector false-negative experiment,
because the compared systems only see the final text. It should not be
described as Humanly process evidence.

## Budget Estimate

Using Prolific's public guidance of a recommended $12/hour rate and an $8/hour
minimum, plus public platform-fee rates:

- Recommended participant rewards: $152.00
- Recommended academic/non-profit total with 33.3% fee: $202.62
- Recommended corporate total with 42.8% fee: $217.06
- Minimum participant rewards: $101.40
- Minimum academic/non-profit total with 33.3% fee: $135.17
- Minimum corporate total with 42.8% fee: $144.80

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

- Confirm that the live AI drafts are approved before worker editing starts.
- Confirm Prolific workspace/project, study currency, and whether we qualify for
  academic/non-profit platform fees.
- Confirm reward levels, especially the long editing task duration and reward.
- Confirm consent language and whether de-identified edited text can be stored
  in this repository.
- Confirm the export format that maps each response back to `sample_id`.
