Make sure to change the directory to the repository root before running commands.

## Clean Code Guardrail

After the work is done and **before every commit**, stage your changes (`git add <files>`) and run the OneCX guardrail on them. It is a deterministic Clean Code and architecture check (function and file size, complexity, nesting, parameters, boolean flags, fan-out, cycles, duplicates, suppressions). Any non-zero exit code means: do not commit (`1` = violations, `2` = tool error; fix the setup, do not skip the check). There is no workspace task for it; run the snippet directly from the repository root. It needs Node 20+ and, for the fallback, an authenticated `gh` CLI.

```sh
G="${TMPDIR:-/tmp}/onecx-guardrail"
if npm view @onecx/guardrail version >/dev/null 2>&1; then
  npx --prefer-offline -y @onecx/guardrail@latest --staged
else
  # not yet on npmjs.org: use the latest GitHub release (npm tarball) directly
  rm -rf "$G" && mkdir -p "$G" \
    && gh release download --repo onecx/onecx-guardrail --pattern 'onecx-guardrail-*.tgz' --dir "$G" \
    && npm install --silent --no-audit --no-fund --prefix "$G" "$G"/onecx-guardrail-*.tgz \
    && "$G/node_modules/.bin/onecx-guardrail" --staged
fi
```

Rules:

- **New code must be compliant.** New files and new functions/methods must meet all thresholds: functions and methods at most 25 non-blank, non-comment lines (50 in `*.spec.ts` / `*.test.ts`); files at most 250; cyclomatic complexity at most 10; cognitive complexity at most 15; nesting depth at most 3; at most 5 `case` branches per `switch`; at most 3 parameters; no boolean flag parameters; at most 15 non-type imports per file; no new circular dependencies; no new copy-paste.
- **Old code follows the boy scout rule.** Existing violations may stay, but no metric that is already over its limit may grow and nothing may newly cross a limit (compared against `HEAD`, or against `.guardrail-baseline.json` if present). A legacy file that is over 250 lines fails on any net growth, so put new code into a new file. Every time you touch legacy code, also leave it better than you found it: split the function you change, replace boolean flags or long parameter lists with options objects, remove a dependency cycle you run into. Keep such cleanups behaviour-neutral and covered by tests.
- **Never hide violations.** Do not add suppression comments (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `jscpd:ignore`) and do not edit the guardrail configuration or a baseline to make the check pass. Fix the design instead, as described in the tool output (extract functions, guard clauses, parameter objects, strategy maps, smaller modules).
- Shell variables may not survive between commands: re-run the whole snippet above, not only its last line, until it prints `[ONECX-GUARDRAIL PASSED]`, then commit.
- When adding a new preloader in `pre_loaders/`, share the common webpack/module-federation config instead of copying an existing preloader folder (copies fail the duplicate-code check).
