const { execFileSync, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const SOURCE_FILE = /^src\/(?!.*\.spec\.[tj]s$).+\.(?:ts|js|html)$/
const DEFAULT_HOST = 'https://sonarcloud.io'
const ORGANIZATION = 'onecx'
const DEFAULT_PROJECT_KEY = 'onecx_onecx-shell-ui'

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

/**
 * Parses the `git diff -U0` output of ONE file into the added/changed line ranges of its new side.
 * The file name is known from `git diff --name-only -z`, so no path header is parsed: names with
 * spaces, quotes or non-ASCII characters and diff.noprefix cannot cause a mismatch.
 * Throws when the output has no `diff --git` header (nothing parseable), so a staged file is never skipped silently.
 * A header without hunks (mode change, empty new file, pure deletion) has no new lines and yields no ranges.
 */
function parseHunkRanges(diff, file) {
  if (!/^diff --git /m.test(diff)) {
    throw new Error(`sonar:staged: cannot parse the staged diff of ${file}`)
  }
  const ranges = []
  for (const line of diff.split('\n')) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line)
    if (hunk) {
      const start = Number(hunk[1])
      const count = hunk[2] === undefined ? 1 : Number(hunk[2])
      if (count > 0) ranges.push([start, start + count - 1])
    }
  }
  return ranges
}

/** Lists staged added/copied/modified/renamed/typed files (NUL separated, so any file name works). */
function stagedFiles() {
  return git(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR']).split('\0').filter(Boolean)
}

/** Reads the staged added/changed ranges of every staged analysable source file. */
function stagedSourceRanges() {
  const ranges = {}
  for (const file of stagedFiles().filter((f) => SOURCE_FILE.test(f))) {
    const diff = git([
      '-c',
      'core.quotePath=false',
      'diff',
      '--cached',
      '--no-ext-diff',
      '--no-color',
      '--src-prefix=a/',
      '--dst-prefix=b/',
      '-U0',
      '--',
      file,
    ])
    ranges[file] = parseHunkRanges(diff, file)
  }
  return ranges
}

function overlapsRanges(ranges, first, last) {
  return ranges.some(([from, to]) => first <= to && last >= from)
}

/** Keeps only issues located on added/changed lines of staged files. */
function filterNewCodeIssues(issues, ranges, projectKey) {
  return issues.filter((issue) => {
    const file = String(issue.component).replace(`${projectKey}:`, '')
    const fileRanges = ranges[file]
    if (!fileRanges) return false
    const first = issue.textRange?.startLine ?? issue.line
    const last = issue.textRange?.endLine ?? issue.line
    return first === undefined || overlapsRanges(fileRanges, first, last)
  })
}

async function api(host, token, pathname) {
  const response = await fetch(`${host}${pathname}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}` },
  })
  if (!response.ok) {
    throw new Error(`Sonar API ${pathname} failed: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function waitForAnalysis(host, token, reportTaskFile) {
  const info = Object.fromEntries(
    fs
      .readFileSync(reportTaskFile, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => l.split(/=(.*)/s).slice(0, 2))
  )
  for (let i = 0; i < 120; i++) {
    const { task } = await api(host, token, `/api/ce/task?id=${encodeURIComponent(info.ceTaskId)}`)
    if (task.status === 'SUCCESS') return
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(`Sonar background task ${task.status}: ${task.errorMessage ?? ''}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error('Timed out waiting for the Sonar background task')
}

async function fetchIssues(host, token, projectKey, pullRequest) {
  const issues = []
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({
      componentKeys: projectKey,
      pullRequest,
      resolved: 'false',
      organization: ORGANIZATION,
      ps: '500',
      p: String(page),
    })
    const data = await api(host, token, `/api/issues/search?${query}`)
    issues.push(...data.issues)
    if (page * 500 >= data.paging.total) return issues
  }
}

/** Exports the staged blobs, so the scanner sees exactly what will be committed (not the working tree). */
function exportIndex(dir) {
  git(['checkout-index', '-a', `--prefix=${dir}${path.sep}`])
}

function runScanner(args, cwd, env) {
  return spawnSync('npx', ['--yes', 'sonarqube-scanner', ...args], {
    cwd,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
}

async function analyze(ranges, env) {
  const projectKey = env.SONAR_PROJECT_KEY || DEFAULT_PROJECT_KEY
  const pullRequest = `precommit-${env.USER || env.USERNAME || 'local'}`
  const host = env.SONAR_HOST_URL || DEFAULT_HOST
  const inclusions = Object.keys(ranges).filter((file) => ranges[file].length > 0)
  if (inclusions.length === 0) {
    console.log('sonar:staged: staged source files have no added or changed lines, nothing to analyze')
    return 0
  }
  const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sonar-staged-'))
  try {
    exportIndex(exportDir)
    const workDir = path.join(exportDir, 'reports', '.scannerwork')
    console.log(`sonar:staged: analyzing ${inclusions.length} staged file(s)`)
    // the token is passed through the environment (SONAR_TOKEN), never on the command line
    const scan = runScanner(
      [
        `-Dsonar.projectKey=${projectKey}`,
        `-Dsonar.host.url=${host}`,
        `-Dsonar.organization=${ORGANIZATION}`,
        `-Dsonar.inclusions=${inclusions.join(',')}`,
        '-Dsonar.scm.disabled=true',
        `-Dsonar.working.directory=${workDir}`,
        `-Dsonar.pullrequest.key=${pullRequest}`,
        `-Dsonar.pullrequest.branch=${pullRequest}`,
        '-Dsonar.pullrequest.base=main',
      ],
      exportDir,
      env
    )
    if (scan.status !== 0) {
      throw new Error(`sonarqube-scanner failed (exit ${scan.status})`)
    }
    await waitForAnalysis(host, env.SONAR_TOKEN, path.join(workDir, 'report-task.txt'))
    const issues = filterNewCodeIssues(
      await fetchIssues(host, env.SONAR_TOKEN, projectKey, pullRequest),
      ranges,
      projectKey
    )
    for (const issue of issues) {
      console.error(`${issue.component.split(':').pop()}:${issue.line ?? '?'} [${issue.rule}] ${issue.message}`)
    }
    return issues.length
  } finally {
    fs.rmSync(exportDir, { recursive: true, force: true })
  }
}

/** Entry point; returns the number of issues on new code. Throws when the gate cannot run. */
async function main(env = process.env, readRanges = stagedSourceRanges) {
  const ranges = readRanges()
  const files = Object.keys(ranges)
  if (files.length === 0) {
    console.log('sonar:staged: no staged source changes, nothing to analyze')
    return 0
  }
  if (!env.SONAR_TOKEN) {
    throw new Error(
      `sonar:staged needs SONAR_TOKEN (and optionally SONAR_HOST_URL, default ${DEFAULT_HOST}) to analyze: ${files.join(', ')}`
    )
  }
  const total = await analyze(ranges, env)
  if (total > 0) {
    throw new Error(`sonar:staged found ${total} issue(s) on new or changed lines`)
  }
  console.log('sonar:staged: no issues on new or changed lines')
  return 0
}

module.exports = { parseHunkRanges, stagedSourceRanges, filterNewCodeIssues, main }

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
