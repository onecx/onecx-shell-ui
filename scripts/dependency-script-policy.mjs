import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * Dependency install-script policy validator for the OneCX Shell UI monorepo.
 *
 * The repository enforces npm's RFC 868 install-script policy with
 * `strict-allow-scripts=true` in the `.npmrc` of every project, so that a
 * dependency whose install-time lifecycle script has not been explicitly
 * reviewed is rejected instead of being silently run. npm 11+/12 enforces that
 * at install time; this script additionally pins the *shape* of each review so
 * that over-broad approvals cannot slip past it, because npm itself happily
 * *runs* a blanket, wildcard, or name-only approval rather than failing.
 *
 * The `allowScripts` field in each project's `package.json` records the review
 * of every scripted dependency using npm's own shapes:
 *
 * - `"pkg": false`            — explicit denial (a reviewed-but-unnecessary
 *                               script simply does not run)
 * - `"pkg@1.2.3": true`       — an exact-version approval; the install script
 *                               runs only for that precise version
 *
 * and these are the only compliant shapes. Each project's `.npmrc` must keep
 * `strict-allow-scripts=true` and must not set a global `allow-scripts=true`.
 *
 * A blanket `"pkg": true`, a wildcard (`"pkg@*"`) or range (`"pkg@^1.0.0"`)
 * approval, a name-only `"pkg": true` approval, and a global
 * `allow-scripts=true` in `.npmrc` are all over-broad and are rejected.
 *
 * Run from the repository root (the default) to validate the six independent
 * policy contexts: the shell root and the five in-scope pre-loaders.
 * `pre_loaders/angular-22` is installed by the root `postinstall` under its own
 * strict policy but is outside the five-pre-loader build set, so it is not
 * validated here.
 *
 * `node scripts/dependency-script-policy.mjs --self-test` runs the validator's
 * cases against a throw-away tree and exits non-zero if any over-broad approval
 * shape is accepted or the exact-version shape is rejected.
 */

// The six independent dependency-script policy contexts.
const PROJECTS = [
  '.',
  'pre_loaders/angular-18',
  'pre_loaders/angular-19',
  'pre_loaders/angular-20',
  'pre_loaders/angular-21',
  'pre_loaders/react-19'
]

// An exact-version approval pins a bare semver (with an optional
// pre-release/build suffix) so a future, unreviewed release cannot silently
// run an install script.
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/

function readNpmrcLines(root, dir) {
  return readFileSync(join(root, dir, '.npmrc'), 'utf8').split('\n')
}

function readManifest(root, dir) {
  return JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'))
}

// Validate one project directory: strict mode on in `.npmrc`, no global
// `allow-scripts=true`, and every `allowScripts` entry either an explicit
// denial (`false`) or an exact-version approval (`"pkg@1.2.3": true`).
function validateProject(root, dir) {
  const errors = []

  try {
    const lines = readNpmrcLines(root, dir)
    if (!lines.some((l) => /^\s*strict-allow-scripts\s*=\s*true\s*$/.test(l))) {
      errors.push(`${dir}/.npmrc: strict-allow-scripts=true is not set`)
    }
    if (lines.some((l) => /^\s*allow-scripts\s*=\s*true\s*$/.test(l))) {
      errors.push(`${dir}/.npmrc: a global allow-scripts=true override is not allowed`)
    }
  } catch {
    errors.push(`${dir}/.npmrc is missing`)
  }

  let manifest
  try {
    manifest = readManifest(root, dir)
  } catch {
    errors.push(`${dir}/package.json is missing or is not valid JSON`)
    return errors
  }

  const allow = manifest.allowScripts
  if (allow === undefined) {
    errors.push(`${dir}/package.json: the 'allowScripts' field is missing`)
    return errors
  }
  if (typeof allow !== 'object' || allow === null || Array.isArray(allow)) {
    errors.push(`${dir}/package.json: 'allowScripts' must be an object`)
    return errors
  }

  for (const [name, value] of Object.entries(allow)) {
    if (value === false) continue // explicit denial — always compliant
    if (value !== true) {
      errors.push(
        `${dir}/package.json: allowScripts["${name}"] value must be true or false, got ${JSON.stringify(value)}`
      )
      continue
    }
    // `value` is `true`: only an exact-version approval is compliant. The
    // version is whatever follows the last `@` (scoped names such as
    // `@scope/pkg` have no version, and `@scope/pkg@1.2.3` ends in one).
    const at = name.lastIndexOf('@')
    const version = at >= 0 ? name.slice(at + 1) : ''
    if (version && EXACT_VERSION.test(version)) continue // pinned exact-version approval
    errors.push(
      `${dir}/package.json: allowScripts["${name}"] is a blanket, wildcard, or name-only approval; ` +
        `approve with an exact version (e.g. "name@1.2.3": true) or deny with "name": false`
    )
  }
  return errors
}

function validateRepo(root = process.cwd()) {
  const errors = []
  for (const dir of PROJECTS) errors.push(...validateProject(root, dir))
  return errors
}

// Build a compliant throw-away repo under `root` for the self-test: each of the
// six project dirs gets a strict `.npmrc` and a `package.json` whose
// `allowScripts` is a single explicit denial.
function scaffold(root) {
  for (const dir of PROJECTS) {
    const abs = join(root, dir)
    mkdirSync(abs, { recursive: true })
    writeFileSync(join(abs, '.npmrc'), 'strict-allow-scripts=true\n')
    writeFileSync(
      join(abs, 'package.json'),
      JSON.stringify({ name: basename(dir), version: '0.0.0', allowScripts: { nx: false } }, null, 2)
    )
  }
}

function setAllowScript(root, dir, key, value) {
  const file = join(root, dir, 'package.json')
  const manifest = JSON.parse(readFileSync(file, 'utf8'))
  manifest.allowScripts[key] = value
  writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n')
}

function setNpmrc(root, dir, line) {
  writeFileSync(join(root, dir, '.npmrc'), line + '\n')
}

// Each over-broad shape must be rejected; the exact-version shape must pass.
const SELF_TEST_CASES = [
  {
    label: 'blanket approval (nx: true)',
    expect: 'fail',
    apply: (r) => setAllowScript(r, 'pre_loaders/react-19', 'nx', true)
  },
  {
    label: 'wildcard approval (nx@*: true)',
    expect: 'fail',
    apply: (r) => setAllowScript(r, 'pre_loaders/react-19', 'nx@*', true)
  },
  {
    label: 'version-range approval (nx@^1.0.0: true)',
    expect: 'fail',
    apply: (r) => setAllowScript(r, 'pre_loaders/react-19', 'nx@^1.0.0', true)
  },
  {
    label: 'name-only approval (@swc/core: true)',
    expect: 'fail',
    apply: (r) => setAllowScript(r, 'pre_loaders/react-19', '@swc/core', true)
  },
  {
    label: 'global allow-scripts=true in .npmrc',
    expect: 'fail',
    apply: (r) => setNpmrc(r, 'pre_loaders/react-19', 'allow-scripts=true\nstrict-allow-scripts=true')
  },
  {
    label: 'exact-version approval (nx@22.7.12: true)',
    expect: 'pass',
    apply: (r) => setAllowScript(r, 'pre_loaders/react-19', 'nx@22.7.12', true)
  }
]

function selfTest() {
  const root = join(tmpdir(), `dsp-self-test-${process.pid}`)
  const failures = []
  try {
    scaffold(root)

    const baseline = validateRepo(root)
    if (baseline.length) failures.push(`baseline: expected to pass, got ${baseline.join('; ')}`)

    for (const { label, expect, apply } of SELF_TEST_CASES) {
      scaffold(root) // reset between cases
      apply(root)
      const errors = validateRepo(root)
      const rejected = errors.length > 0
      if (rejected !== (expect === 'fail')) {
        failures.push(`${label}: expected ${expect}, got ${rejected ? 'reject' : 'accept'}`)
      }
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }

  if (failures.length) {
    console.error('Dependency install-script policy self-test failed:')
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log(`Dependency install-script policy self-test passed (${SELF_TEST_CASES.length} cases).`)
}

if (process.argv.includes('--self-test')) {
  selfTest()
} else {
  const errors = validateRepo()
  if (errors.length) {
    console.error('Dependency install-script policy violations:')
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(`Dependency install-script policy OK for ${PROJECTS.length} projects.`)
}
