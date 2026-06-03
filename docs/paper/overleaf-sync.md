# Overleaf Sync

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

The `paper` branch is the source of truth for the Humanly paper materials. The
Overleaf project is treated as a preview and collaboration surface.

## Sync Direction

GitHub `paper` branch -> Overleaf `master`

The workflow at `.github/workflows/sync-overleaf.yml` runs on pushes to
`paper` when these paths change:

- `latex/**`
- `figures/**`
- `.github/workflows/sync-overleaf.yml`

The workflow fully mirrors `latex/` into Overleaf. It syncs `figures/` only when
there are real figure files in GitHub, so an empty `.gitkeep` directory does not
delete temporary Overleaf assets.

## Required GitHub Secrets

Add these repository secrets before relying on the workflow:

- `OVERLEAF_PROJECT_ID`: the Overleaf project id from the Overleaf Git remote.
- `OVERLEAF_TOKEN`: an Overleaf Git token or password for an account with access
  to the project.

Do not commit the token or any Overleaf credential into the repository.
If these secrets are not configured, the workflow exits successfully with a
notice and does not push anything to Overleaf.

## Operating Rules

- Make durable paper edits on the GitHub `paper` branch.
- Avoid editing the same files directly in Overleaf after this sync is enabled;
  the next GitHub push can overwrite them.
- If someone edits in Overleaf directly, reconcile those changes into GitHub
  first by pulling the Overleaf repo, copying the changed source files into the
  GitHub `paper` branch, then committing and pushing `paper`.
- Do not merge the orphan `paper` branch into `main`; it is intentionally
  paper-only and does not contain application source code.
