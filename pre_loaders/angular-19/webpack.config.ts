import { Configuration } from 'webpack'
import config from './module-federation.config'
import { withModuleFederation } from '@nx/angular/module-federation'
import { ModifySourcePlugin, ReplaceOperation } from 'modify-source-webpack-plugin'

/**
 * When module federation loads a package it checks:
 * - eager flag - if package should be eagerly loaded
 * - loaded flag - if package is already loaded
 * - name of the webpack output
 *
 * If the following conditions are met:
 * - there is a package registered that matches the required shared package
 * - the matched package is not loaded yet
 * - the sharing config of that package is not eager
 *
 * then the package is chosen based on the name of the webpack output.
 *
 * The algorithm used for choosing the packgage is string comparison. E.g., 'a' > 'b'.
 *
 * To make sure that the preloader is chosen over other packages, we use a magic character
 * that is greater than any other character in the Unicode table.
 */
const magicChar = String.fromCodePoint(0x10ffff) // Magic character for preloaders

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
    shareScope: 'default'
  })
  const webpackConfig = withMf(baseConfig)

  return {
    ...webpackConfig,
    devtool: 'source-map',
    plugins: [...(webpackConfig.plugins ?? []), modifyPrimeNgPlugin, modifyAngularCorePlugin],
    output: {
      uniqueName: magicChar + 'onecx-angular-19-loader',
      publicPath: 'auto',
      devtoolNamespace: 'onecx-angular-19-loader'
    },
    module: {
      ...webpackConfig.module,
      parser: {
        ...webpackConfig.module.parser,
        javascript: { ...webpackConfig.module.parser.javascript, importMeta: false }
      }
    }
  }
}
