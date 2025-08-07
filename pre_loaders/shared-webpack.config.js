const { ModifyEntryPlugin } = require('@angular-architects/module-federation/src/utils/modify-entry-plugin')
const { withModuleFederationPlugin, shareAll } = require('@angular-architects/module-federation/webpack')
const { ModifySourcePlugin, ReplaceOperation } = require('modify-source-webpack-plugin')

function createWebpackConfig(loaderName, exposedModule, exposedKey) {
  const webpackConfig = {
    ...withModuleFederationPlugin({
      name: loaderName,
      filename: 'remoteEntry.js',
      exposes: {
        [exposedKey]: exposedModule
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

  return {
    ...webpackConfig,
    plugins: [...plugins, modifyPrimeNgPlugin],
    output: { uniqueName: loaderName, publicPath: 'auto' },
    experiments: { ...webpackConfig.experiments, topLevelAwait: true },
    optimization: { runtimeChunk: false, splitChunks: false }
  }
}

module.exports = { createWebpackConfig }
