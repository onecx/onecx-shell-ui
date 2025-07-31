const { ModifyEntryPlugin } = require('@angular-architects/module-federation/src/utils/modify-entry-plugin')
const { withModuleFederationPlugin, shareAll } = require('@angular-architects/module-federation/webpack')

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

  return {
    ...webpackConfig,
    plugins,
    output: { uniqueName: loaderName, publicPath: 'auto' },
    experiments: { ...webpackConfig.experiments, topLevelAwait: true },
    optimization: { runtimeChunk: false, splitChunks: false },
    module: { parser: { javascript: { importMeta: false } } },
  }
}

module.exports = { createWebpackConfig }
