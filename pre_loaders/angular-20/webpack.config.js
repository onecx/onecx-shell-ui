const { ModifyEntryPlugin } = require('@angular-architects/module-federation/src/utils/modify-entry-plugin')
const { withModuleFederationPlugin, shareAll } = require('@angular-architects/module-federation/webpack')
const { ModifySourcePlugin, ReplaceOperation } = require('modify-source-webpack-plugin')

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

const webpackConfig = {
  ...withModuleFederationPlugin({
    name: magicChar + 'onecx-angular-20-loader',
    filename: 'remoteEntry.js',
    exposes: {
      ['./Angular20Loader']: 'src/main.ts'
    },
    shared: shareAll({ requiredVersion: 'auto', includeSecondaries: true }, undefined, './')
  })
}

const plugins = webpackConfig.plugins.filter((plugin) => !(plugin instanceof ModifyEntryPlugin))

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

module.exports = {
  ...webpackConfig,
  plugins: [...plugins, modifyPrimeNgPlugin],
  output: { uniqueName: magicChar + 'onecx-angular-20-loader', publicPath: 'auto' },
  experiments: { ...webpackConfig.experiments, topLevelAwait: true },
  optimization: { runtimeChunk: false, splitChunks: false },
  module: { parser: { javascript: { importMeta: false } } }
}
