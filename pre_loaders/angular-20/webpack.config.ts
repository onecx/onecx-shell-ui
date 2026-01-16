import { Configuration } from 'webpack'
import config from './module-federation.config'
import { withModuleFederation } from '@nx/angular/module-federation'
import { ModifySourcePlugin, ReplaceOperation } from 'modify-source-webpack-plugin'

const modifyPrimeNgPlugin = new ModifySourcePlugin({
  rules: [
    {
      test: (module) => {
        if (module.resource) {
          return module.resource.includes('primeng')
        }
        return false
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

// Replace createElement only in @angular/platform-browser SharedStylesHost
const modifyAngularCorePlugin = new ModifySourcePlugin({
  rules: [
    {
      test: (module) => {
        if (module.resource) {
          return module.resource.includes('@angular/platform-browser')
        }
        return false
      },
      operations: [
        new ReplaceOperation(
          'all',
          "this\\.doc\\.createElement\\(\\'style\\'",
          "this.doc.createElementFromSharedStylesHost({'this': this, 'arguments': Array.from(arguments)},'style'"
        )
      ]
    }
  ]
})

export default async function (baseConfig: Configuration) {
  const withMf = await withModuleFederation(config, {
    shareScope: 'angular-20'
  })
  const webpackConfig = withMf(baseConfig)

  return {
    ...webpackConfig,
    // output: { uniqueName: magicChar + 'onecx-angular-20-loader', publicPath: 'auto' },
    plugins: [...(webpackConfig.plugins ?? []), modifyPrimeNgPlugin, modifyAngularCorePlugin],
    module: {
      ...webpackConfig.module,
      parser: {
        ...webpackConfig.module.parser,
        javascript: { ...webpackConfig.module.parser.javascript, importMeta: false }
      }
    }
    // experiments: { ...webpackConfig.experiments, topLevelAwait: true },
    // optimization: { runtimeChunk: false, splitChunks: false }
  }
}
