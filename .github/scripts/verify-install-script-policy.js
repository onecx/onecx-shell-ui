// Verifies the dependency install-script policy of the root project and every
// pre-loader project (npm 12 `allowScripts` + `strict-allow-scripts`).
// Used by .github/workflows/install-script-policy.yml; run it from the
// repository root with npm 12 on the PATH.
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PACKAGE_NAME = /^(@[a-z0-9][\w.~-]*\/)?[a-z0-9][\w.~-]*$/
const EXACT_VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/
const BYPASS_FLAG = /--(dangerously-allow-all-scripts|allow-scripts)(?![\w-])/

const errors = []
const fail = (project, message) => errors.push(`${project}: ${message}`)

const preLoaders = fs
  .readdirSync('pre_loaders', { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join('pre_loaders', entry.name, 'package.json')))
  .map((entry) => path.join('pre_loaders', entry.name))
const projects = ['.', ...preLoaders]

// The check installs through the root postinstall and builds through build-preloaders.sh,
// so both must cover every pre-loader.
const rootPostinstall = JSON.parse(fs.readFileSync('package.json', 'utf-8')).scripts?.postinstall ?? ''
const buildScript = fs.readFileSync('build-preloaders.sh', 'utf-8')
for (const preLoader of preLoaders) {
  if (!rootPostinstall.split('&&').some((command) => command.trim() === `npm install --prefix ${preLoader}`)) {
    fail(preLoader, 'is not installed by the root postinstall script')
  }
  if (!buildScript.includes(`(cd ./${preLoader} && npm run build)`)) {
    fail(preLoader, 'is not built by build-preloaders.sh')
  }
}

for (const project of projects) {
  const npmrcPath = path.join(project, '.npmrc')
  const npmrc = fs.existsSync(npmrcPath) ? fs.readFileSync(npmrcPath, 'utf-8') : ''
  if (!/^\s*strict-allow-scripts\s*=\s*true\s*$/m.test(npmrc)) {
    fail(project, '.npmrc must set strict-allow-scripts=true')
  }
  if (/^\s*(dangerously-allow-all-scripts|allow-scripts)\s*=/m.test(npmrc)) {
    fail(project, '.npmrc must not set allow-scripts or dangerously-allow-all-scripts')
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf-8'))
  for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
    if (BYPASS_FLAG.test(command)) {
      fail(project, `script "${name}" must not pass --allow-scripts or --dangerously-allow-all-scripts`)
    }
  }

  const allowScripts = manifest.allowScripts
  if (allowScripts === null || typeof allowScripts !== 'object' || Array.isArray(allowScripts)) {
    fail(project, 'package.json must contain an allowScripts object')
    continue
  }
  for (const [selector, allowed] of Object.entries(allowScripts)) {
    if (allowed === false) {
      if (!PACKAGE_NAME.test(selector)) {
        fail(project, `denial "${selector}" must be a name-only entry`)
      }
    } else if (allowed === true) {
      const at = selector.lastIndexOf('@')
      const name = selector.slice(0, at)
      const version = selector.slice(at + 1)
      if (at <= 0 || !PACKAGE_NAME.test(name) || !EXACT_VERSION.test(version)) {
        fail(project, `approval "${selector}" must be pinned to one exact version (name@x.y.z)`)
      }
    } else {
      fail(project, `allowScripts entry "${selector}" must be true or false`)
    }
  }

  // Effective configuration from all layers (environment, project, user, global).
  const config = Object.fromEntries(
    execFileSync('npm', ['config', 'get', 'strict-allow-scripts', 'dangerously-allow-all-scripts', 'allow-scripts'], {
      cwd: project,
      encoding: 'utf-8'
    })
      .trim()
      .split('\n')
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
  )
  if (config['strict-allow-scripts'] !== 'true') fail(project, 'effective strict-allow-scripts is not true')
  if (config['dangerously-allow-all-scripts'] !== 'false') fail(project, 'dangerously-allow-all-scripts is enabled')
  if (config['allow-scripts'] !== '') fail(project, `global allow-scripts approval found: ${config['allow-scripts']}`)
}

if (errors.length > 0) {
  console.error(`Install-script policy violations:\n${errors.map((error) => `  - ${error}`).join('\n')}`)
  process.exit(1)
}
console.log(`Install-script policy OK for: ${projects.join(', ')}`)
