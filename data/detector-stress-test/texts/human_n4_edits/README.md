# Human N4 Edit Drop Folder

This folder is for collected N4 human-edited AI-draft samples.

N4 is a non-compliant / mixed-AI-origin condition: the substantive draft comes
from AI, and a human performs light local editing. Do not store personal
information, consent notes, payment notes, or raw participant metadata here.
Keep that metadata privately outside the public dataset.

Create exactly these files when edits are collected:

- `n4_short_01.txt` through `n4_short_10.txt`
- `n4_medium_01.txt` through `n4_medium_10.txt`
- `n4_long_01.txt` through `n4_long_10.txt`

Use `../../n4-human-edit-manifest.csv` to map each file to its AI draft,
length bucket, task type, and final destination path.

After files are collected, import them with:

```bash
node data/detector-stress-test/scripts/import_n4_human_edits.mjs --force
node data/detector-stress-test/scripts/build_case_generation_jobs.mjs
node data/detector-stress-test/scripts/build_detector_run_pack.mjs
node data/detector-stress-test/scripts/audit_paper_ready_gates.mjs
node data/detector-stress-test/scripts/validate_dataset.mjs
```
