const fs = require('fs').promises
const path = require('path')

const EXPORTS_BLACKLIST = ['.', './package.json']

const DEPENDENCY_BLACKLIST = [
  '@nx/angular',
  '@module-federation/enhanced',
  '@module-federation/runtime-core',
  '@module-federation/dts-plugin'
]

const FULL_PACKAGE_BLACKLIST = [
  '@angular/common/locales/global/*',
  '@angular/common/locales/*',
  '@angular/common/upgrade',
  '@angular/core/schematics/*',
  '@angular/core/event-dispatch-contract.min.js',
  '@angular/service-worker/ngsw-worker.js',
  '@angular/service-worker/safety-worker.js',
  '@angular/service-worker/config/schema.json',
  '@angular/router/upgrade',
  '@angular/localize/tools',
  'rxjs/internal/*',
  'primeng/resources/',
  'primeng/editor',
  '@onecx/angular-accelerator/testing',
  '@onecx/angular-accelerator/migrations.json'
]

async function main() {
  try {
    const folders = await fs.readdir('./pre_loaders')

    for (const folder of folders) {
      const folderPath = path.join('./pre_loaders', folder)
      const folderStat = await fs.stat(folderPath)
      if (!folderStat.isDirectory()) continue

      const packagePath = path.join('./pre_loaders', folder, 'package.json')
      const packageFile = await fs.readFile(packagePath, 'utf-8')
      const packageContent = JSON.parse(packageFile)

      let output = ''

      for (const dependency of Object.keys(packageContent.dependencies)) {
        if (DEPENDENCY_BLACKLIST.includes(dependency)) continue
        output += `import("${dependency}");\n`
        const subImports = await generateImportsForSubpackages(dependency, folder)
        output += subImports
      }

      output += 'export default {};\n'

      const dummyPath = path.join('./pre_loaders', folder, 'src/dummy.ts')
      await fs.writeFile(dummyPath, output)
    }
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

async function generateImportsForSubpackages(dependency, folder) {
  const dependencyPackagePath = path.join('./pre_loaders', folder, 'node_modules', dependency, 'package.json')
  try {
    const dependencyPackage = await fs.readFile(dependencyPackagePath, 'utf-8')
    const packageContent = JSON.parse(dependencyPackage)

    let output = ''
    if ('exports' in packageContent) {
      for (const exportKey of Object.keys(packageContent.exports)) {
        if (EXPORTS_BLACKLIST.includes(exportKey)) continue
        const fullPackage = `${dependency}/${removeExportPrefix(exportKey)}`
        if (FULL_PACKAGE_BLACKLIST.includes(fullPackage)) continue
        output += `import("${fullPackage}");\n`
      }
    }
    return output
  } catch (err) {
    console.error(`Could not find package.json for dependency ${dependency}`, err)
    return ''
  }
}

function removeExportPrefix(str) {
  return str.replace('./', '')
}

main()
