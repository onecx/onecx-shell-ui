const { execFileSync, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const SOURCE_FILE = /^src\/(?!.*\.spec\.[tj]s$).+\.(?:ts|js|html)$/
const DEFAULT_HOST = 'https://sonarcloud.io'
const ORGANIZATION = 'onecx'
const DEFAULT_PROJECT_KEY = 'onecx_onecx-shell-ui'

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

/** Parses `git diff -U0` output into { file -> [[firstLine, lastLine], ...] } for the new side of each hunk. */
function parseAddedRanges(diff) {
  const result = {}
  let file = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      file = line.startsWith('+++ b/') ? line.slice(6) : null
      continue
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line)
    if (hunk && file) {
      const start = Number(hunk[1])
      const count = hunk[2] === undefined ? 1 : Number(hunk[2])
      if (count > 0) {
        ;(result[file] ??= []).push([start, start + count - 1])
      }
    }
  }
  return result
}

/** Keeps only staged added/changed ranges of analysable source files; docs, config and specs are ignored. */
function filterSourceRanges(ranges) {
  return Object.fromEntries(Object.entries(ranges).filter(([file]) => SOURCE_FILE.test(file)))
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

async function analyze(ranges, env) {
  const projectKey = env.SONAR_PROJECT_KEY || DEFAULT_PROJECT_KEY
  const pullRequest = `precommit-${env.USER || env.USERNAME || 'local'}`
  const host = env.SONAR_HOST_URL || DEFAULT_HOST
  const inclusions = Object.keys(ranges)
  const workDir = path.resolve('reports', '.scannerwork')

  console.log(`sonar:staged: analyzing ${inclusions.length} staged file(s)`)
  const scan = spawnSync(
    'npx',
    [
      'sonar-scanner',
      `-Dsonar.projectKey=${projectKey}`,
      `-Dsonar.host.url=${host}`,
      `-Dsonar.token=${env.SONAR_TOKEN}`,
      `-Dsonar.organization=${ORGANIZATION}`,
      `-Dsonar.inclusions=${inclusions.join(',')}`,
      '-Dsonar.scm.disabled=true',
      `-Dsonar.working.directory=${workDir}`,
      `-Dsonar.pullrequest.key=${pullRequest}`,
      `-Dsonar.pullrequest.branch=${pullRequest}`,
      '-Dsonar.pullrequest.base=main',
    ],
    { stdio: 'inherit', env }
  )
  if (scan.status !== 0) {
    throw new Error(`sonar-scanner failed (exit ${scan.status})`)
  }

  await waitForAnalysis(host, env.SONAR_TOKEN, path.join(workDir, 'report-task.txt'))
  const issues = filterNewCodeIssues(await fetchIssues(host, env.SONAR_TOKEN, projectKey, pullRequest), ranges, projectKey)
  for (const issue of issues) {
    console.error(`${issue.component.split(':').pop()}:${issue.line ?? '?'} [${issue.rule}] ${issue.message}`)
  }
  return issues.length
}

async function main() {
  const ranges = filterSourceRanges(parseAddedRanges(git(['diff', '--cached', '-U0', '--diff-filter=ACMR', '--no-color'])))
  const files = Object.keys(ranges)
  if (files.length === 0) {
    console.log('sonar:staged: no staged source changes, nothing to analyze')
    return
  }
  if (!process.env.SONAR_TOKEN) {
    throw new Error(
      `sonar:staged needs SONAR_TOKEN (and optionally SONAR_HOST_URL, default ${DEFAULT_HOST}) to analyze: ${files.join(', ')}`
    )
  }
  const total = await analyze(ranges, process.env)
  if (total > 0) {
    throw new Error(`sonar:staged found ${total} issue(s) on new or changed lines`)
  }
  console.log('sonar:staged: no issues on new or changed lines')
}

module.exports = { parseAddedRanges, filterSourceRanges, filterNewCodeIssues }

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
