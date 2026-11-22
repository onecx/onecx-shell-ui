const assert = require('node:assert/strict')
const { execFileSync, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

// runs the real script against the repo's real prettier in a temp git repo
function run(content) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'prettier-staged-test-'))
  try {
    execFileSync('git', ['init', '-q'], { cwd: repo })
    fs.writeFileSync(path.join(repo, 'a.ts'), content)
    execFileSync('git', ['add', 'a.ts'], { cwd: repo })
    return spawnSync(process.execPath, [path.join(__dirname, 'prettier-staged.js')], {
      cwd: repo,
      encoding: 'utf8',
      env: { ...process.env, NODE_PATH: path.join(__dirname, '..', 'node_modules') }
    })
  } finally {
    fs.rmSync(repo, { recursive: true, force: true })
  }
}

test('a badly formatted staged file fails', () => {
  const result = run('const  x=1')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Formatting check failed for staged file: a\.ts/)
})

test('a formatted staged file passes', () => {
  assert.equal(run('const x = 1;\n').status, 0)
})
