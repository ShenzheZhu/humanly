# Prolific C4 Writing Study Pack

Checked: 2026-06-05

Purpose: collect the 30 C4 human-written AI-style samples through Prolific
rather than informal recruitment. C4 is a compliant false-positive-risk case:
the text is human-written, but intentionally uses formal and AI-associated
style.

## Generated Files

- `prolific/c4-writing-items.csv`: one row per required C4 sample.
- `prolific/c4-writing-budget-estimate.csv`: reward and platform-fee estimate
  by length bucket.
- `prolific/c4-writing-worker-instructions.html`: draft worker-facing
  instructions for a Prolific external-link study.
- `prolific/c4-writing-launch-packet.md`: global worker instructions plus
  every concrete C4 input prompt in one reviewable file.

## Recommended Study Design

- Use Prolific as recruitment/payment layer.
- Collect direct writing through a Prolific text field or linked survey text
  field. This means C4 is self-attested human-origin final text, not
  Humanly-traced process evidence.
- Run three separate Prolific studies or quota arms:
  - short: 10 participants, one 120-180 word social media post each.
  - medium: 10 participants, one 400-600 word student response each.
  - long: 10 participants, one 1000-1500 word paper review each.
- Assign one sample id per participant. Do not ask one participant to write
  multiple C4 samples unless we explicitly decide to trade author diversity for
  cost.
- Export final texts into `texts/human_c4/<sample_id>.txt`, then run the C4
  importer.

This is sufficient for the final-text detector false-positive experiment,
because the compared systems only see the final text. It should not be described
as Humanly process evidence.

## Budget Estimate

Using Prolific's public guidance of a recommended $12/hour rate and an $8/hour
minimum, plus public platform-fee rates:

- Recommended participant rewards: $220.00
- Recommended academic/non-profit total with 33.3% fee: $293.26
- Recommended corporate total with 42.8% fee: $314.16
- Minimum participant rewards: $146.80
- Minimum academic/non-profit total with 33.3% fee: $195.68
- Minimum corporate total with 42.8% fee: $209.63

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

- Confirm whether C4 will be collected inside Prolific or through an external
  survey form linked from Prolific.
- Confirm Prolific workspace/project, study currency, and whether we qualify for
  academic/non-profit platform fees.
- Confirm reward levels, especially the long writing task duration and reward.
- Confirm consent language and whether de-identified text can be stored in
  this repository.
- Confirm the export format that maps each response back to `sample_id`.
