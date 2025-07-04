const { ModifyEntryPlugin } = require('@angular-architects/module-federation/src/utils/modify-entry-plugin')
const { withModuleFederationPlugin, shareAll } = require('@angular-architects/module-federation/webpack')

const webpackConfig = {
  ...withModuleFederationPlugin({
    name: 'onecx-angular-20-loader',
    filename: 'remoteEntry.js',
    exposes: {
      './Angular20Loader': 'src/main.ts'
    },
    shared: shareAll({ requiredVersion: 'auto', includeSecondaries: true }, undefined, './')
  })
}

const plugins = webpackConfig.plugins.filter((plugin) => !(plugin instanceof ModifyEntryPlugin))

module.exports = {
  ...webpackConfig,
  plugins,
  output: { uniqueName: 'onecx-angular-20-loader', publicPath: 'auto' },
  experiments: { ...webpackConfig.experiments, topLevelAwait: true },
  optimization: { runtimeChunk: false, splitChunks: false }
}
