# Human C4 Sample Drop Folder

This folder is for collected C4 human-written AI-style samples.

Do not commit personal information, consent notes, payment notes, or raw
participant metadata here. Store that metadata privately outside the public
dataset.

Create exactly these files when samples are collected:

- `c4_short_01.txt` through `c4_short_10.txt`
- `c4_medium_01.txt` through `c4_medium_10.txt`
- `c4_long_01.txt` through `c4_long_10.txt`

Use `../../c4-human-collection-manifest.csv` to map each file to its length
bucket, task type, source prompt, and final destination path.

After files are collected, import them with:

```bash
node data/detector-stress-test/scripts/import_c4_human_samples.mjs --force
node data/detector-stress-test/scripts/build_detector_run_pack.mjs
node data/detector-stress-test/scripts/audit_paper_ready_gates.mjs
node data/detector-stress-test/scripts/validate_dataset.mjs
```
