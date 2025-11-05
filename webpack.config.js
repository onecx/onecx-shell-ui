import moduleFederationConfig from './module-federation.config'
import { withModuleFederation } from '@nx/angular/module-federation'
const { ModifySourcePlugin, ReplaceOperation } = require('modify-source-webpack-plugin')

const modifyPrimeNgPlugin = new ModifySourcePlugin({
  rules: [
    {
      test: (module) => {
        return module.resource && module.resource.includes('primeng')
      },
      operations: [
        new ReplaceOperation(
          'all',
          'document\\.createElement\\(',
          'document.createElementFromPrimeNg({"this": this, "arguments": Array.from(arguments)},'
        ),
        new ReplaceOperation('all', 'Theme.setLoadedStyleName', '(function(_){})')
      ]
    }
  ]
})

module.exports = async (config) => {
  const fromModuleFederation = await withModuleFederation({
    ...moduleFederationConfig
  })

  // let Nx / module federation compose the base config
  config = fromModuleFederation(config)

  return {
    ...config,
    plugins: [...(config.plugins || []), modifyPrimeNgPlugin],
    module: {
      ...config.module,
      parser: {
        ...config.module?.parser,
        javascript: {
          ...(config.module?.parser?.javascript || {}),
          importMeta: false
        }
      }
    }
  }
}
