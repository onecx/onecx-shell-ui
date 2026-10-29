# Contributing to OneCX Shell UI

## Commit hooks

Commits are validated locally by [Husky](https://typicode.github.io/husky/) hooks. The hooks are the canonical npm Hook Template maintained in [onecx-ai-workflows](https://github.com/onecx/onecx-ai-workflows/tree/main/templates/pre-commit/npm). Update them from there instead of editing them here.

`npm install` (or `npm ci`) installs the hooks through the `prepare` script.

### pre-commit

- `npm run lint` and `npm run prettier` run on every commit.
- `build` and `test:ci` (plus `test:arch` and `test:a11y` if defined) only run when the `CI` or `FORCE_CI_COMMIT_HOOKS` environment variable is set.
- `test:ci` runs Karma with `--browsers=ChromeHeadless`, so a forced run needs Chrome or Chromium installed locally (set `CHROME_BIN` if it is not found).
- `sonar` is skipped by default, even in CI, because it needs `sonar-scanner` and a Sonar server. Set `RUN_SONAR_COMMIT_HOOKS=1` together with `CI` or `FORCE_CI_COMMIT_HOOKS` to run it.
- `EXTRA_LINT_SCRIPTS` adds more always-run scripts and `EXTRA_QA_SCRIPTS` adds more CI-gated scripts, both as space-separated script names.
- The commit is aborted if any check fails. Fix the reported issues, for example with `npm run format` or `npx prettier --write <file>`, and commit again.

To run the full set of checks locally:

```sh
FORCE_CI_COMMIT_HOOKS=1 git commit
```

### commit-msg

- The commit message is linted with [commitlint](https://commitlint.js.org/) against `.commitlintrc.json` (Conventional Commits). Allowed types: `chore`, `ci`, `docs`, `feat`, `fix`, `refactor`. The subject must be at least 5 characters long. Example: `fix: correct menu item ordering`.
- If `WORKFLOW_FORBIDDEN_TERMS` is set (comma- or newline-separated, case-insensitive), a commit whose message, author or committer contains one of those terms is rejected. If it is not set, the hook prints a note and skips this check.
