const assert = require('node:assert/strict')
const { test } = require('node:test')
const { parseAddedRanges, filterSourceRanges, filterNewCodeIssues } = require('./sonar-staged.js')

const diff = [
  'diff --git a/src/app/a.ts b/src/app/a.ts',
  '--- a/src/app/a.ts',
  '+++ b/src/app/a.ts',
  '@@ -3,2 +3,3 @@',
  '@@ -10 +11 @@',
  '@@ -20,2 +22,0 @@',
  'diff --git a/README.md b/README.md',
  '--- a/README.md',
  '+++ b/README.md',
  '@@ -1 +1,2 @@',
].join('\n')

test('parses added ranges and ignores pure deletions', () => {
  assert.deepEqual(parseAddedRanges(diff), {
    'src/app/a.ts': [
      [3, 5],
      [11, 11],
    ],
    'README.md': [[1, 2]],
  })
})

test('only sources are kept, docs, config and specs are ignored', () => {
  assert.deepEqual(Object.keys(filterSourceRanges(parseAddedRanges(diff))), ['src/app/a.ts'])
  assert.deepEqual(filterSourceRanges({ 'package.json': [[1, 1]], 'src/app/a.spec.ts': [[1, 1]] }), {})
})

test('only issues on added or changed lines of staged files are kept', () => {
  const ranges = { 'src/app/a.ts': [[3, 5]] }
  const issues = [
    { component: 'k:src/app/a.ts', line: 4 },
    { component: 'k:src/app/a.ts', line: 9 },
    { component: 'k:src/app/b.ts', line: 4 },
    { component: 'k:src/app/a.ts', textRange: { startLine: 1, endLine: 3 } },
  ]
  assert.deepEqual(filterNewCodeIssues(issues, ranges, 'k'), [issues[0], issues[3]])
})
