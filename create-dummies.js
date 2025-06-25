// This script will create a dummy.ts for all preloaders. This file will contain imports to all dependencies defined in preloader's package.json.
const fs = require('fs')
const process = require('process')
fs.readdir('./pre_loaders', (err, folders) => {
  if (err) {
    console.error('Could not find pre_loaders', err)
    process.exit(1)
  }

  folders.forEach((folder) => {
    console.log(folder)
    fs.readFile('./pre_loaders/' + folder + '/package.json', (err, packageFile) => {
      if (err) {
        console.error(`Could not find package.json for ${folder}`, err)
        process.exit(1)
      }

      const packageContent = JSON.parse(packageFile)
      let output = ''
      Object.keys(packageContent.dependencies).forEach((dependency) => {
        output += `import ("${dependency}");`
      })
      output += 'export default {}'
      fs.writeFile('./pre_loaders/' + folder + '/src/dummy.ts', output, () => {})
    })
  })
})
