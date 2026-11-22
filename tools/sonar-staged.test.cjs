const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')
const { parseHunkRanges, stagedSourceRanges, filterNewCodeIssues, main } = require('./sonar-staged.js')

const header = (name) => `diff --git a/${name} b/${name}\nindex 1..2 100644\n--- a/${name}\n+++ b/${name}\n`

test('parses added ranges and ignores pure deletions', () => {
  const diff = header('src/a.ts') + '@@ -3,2 +3,3 @@\n@@ -10 +11 @@\n@@ -20,2 +22,0 @@\n'
  assert.deepEqual(parseHunkRanges(diff, 'src/a.ts'), [
    [3, 5],
    [11, 11]
  ])
})

test('a new file (/dev/null source) yields its whole range', () => {
  const diff =
    'diff --git a/src/n.ts b/src/n.ts\nnew file mode 100644\n--- /dev/null\n+++ b/src/n.ts\n@@ -0,0 +1,4 @@\n'
  assert.deepEqual(parseHunkRanges(diff, 'src/n.ts'), [[1, 4]])
})

test('headers with trailing tab, quotes or without prefixes do not matter', () => {
  const tab = 'diff --git a/src/a b.ts b/src/a b.ts\n--- a/src/a b.ts\t\n+++ b/src/a b.ts\t\n@@ -1 +1 @@\n'
  const quoted =
    'diff --git "a/src/\\303\\244.ts" "b/src/\\303\\244.ts"\n--- "a/src/\\303\\244.ts"\n+++ "b/src/\\303\\244.ts"\n@@ -2 +2,2 @@\n'
  const noprefix = 'diff --git src/a.ts src/a.ts\n--- src/a.ts\n+++ src/a.ts\n@@ -5 +5 @@\n'
  assert.deepEqual(parseHunkRanges(tab, 'src/a b.ts'), [[1, 1]])
  assert.deepEqual(parseHunkRanges(quoted, 'src/ä.ts'), [[2, 3]])
  assert.deepEqual(parseHunkRanges(noprefix, 'src/a.ts'), [[5, 5]])
})

test('a mode-only change has no added lines, an unparseable diff throws', () => {
  assert.deepEqual(
    parseHunkRanges('diff --git a/src/a.ts b/src/a.ts\nold mode 100644\nnew mode 100755\n', 'src/a.ts'),
    []
  )
  assert.throws(() => parseHunkRanges('', 'src/a.ts'), /cannot parse/)
})

test('only issues on added or changed lines of staged files are kept', () => {
  const ranges = { 'src/a.ts': [[3, 5]] }
  const issues = [
    { component: 'k:src/a.ts', line: 4 },
    { component: 'k:src/a.ts', line: 9 },
    { component: 'k:src/b.ts', line: 4 },
    { component: 'k:src/a.ts', textRange: { startLine: 1, endLine: 3 } }
  ]
  assert.deepEqual(filterNewCodeIssues(issues, ranges, 'k'), [issues[0], issues[3]])
})

test('staged source without SONAR_TOKEN fails, nothing staged passes', async () => {
  await assert.rejects(
    main(
      {},
      () => ({ 'src/a.ts': [[1, 1]] }),
      () => {}
    ),
    /needs SONAR_TOKEN/
  )
  assert.equal(
    await main(
      {},
      () => ({}),
      () => {}
    ),
    0
  )
})

test('staged ranges are read from the index for odd file names', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sonar-staged-test-'))
  const cwd = process.cwd()
  try {
    const git = (...args) => execFileSync('git', args, { cwd: repo })
    git('init', '-q')
    git('config', 'diff.noprefix', 'true')
    fs.mkdirSync(path.join(repo, 'src'))
    fs.writeFileSync(path.join(repo, 'src', 'a b ä.ts'), 'one\n')
    fs.writeFileSync(path.join(repo, 'README.md'), 'doc\n')
    git('add', '.')
    process.chdir(repo)
    assert.deepEqual(stagedSourceRanges(), { 'src/a b ä.ts': [[1, 1]] })
  } finally {
    process.chdir(cwd)
    fs.rmSync(repo, { recursive: true, force: true })
  }
})

test('staged specs under src/app are analysed as tests, other staged sources as sources', async () => {
  const { isTestFile, isSourceFile } = require('./sonar-staged.js')
  assert.equal(isSourceFile('src/app/a.spec.ts'), true)
  assert.equal(isTestFile('src/app/a.spec.ts'), true)
  assert.equal(isTestFile('src/app/a.ts'), false)
  assert.equal(isSourceFile('README.md'), false)
})

test('file-level issues count only for newly added files', () => {
  const ranges = { 'src/old.ts': [[1, 1]], 'src/new.ts': [[1, 9]] }
  const issues = [{ component: 'k:src/old.ts' }, { component: 'k:src/new.ts' }]
  assert.deepEqual(filterNewCodeIssues(issues, ranges, 'k', new Set(['src/new.ts'])), [issues[1]])
  assert.deepEqual(filterNewCodeIssues(issues, ranges, 'k'), [])
})
