const { ModifyEntryPlugin } = require('@angular-architects/module-federation/src/utils/modify-entry-plugin')
const { share, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack')

const webpackConfig = {
  ...withModuleFederationPlugin({
    name: 'onecx-shell',
    filename: 'remoteEntry.js',
    exposes: {
      './Angular18Loader': 'src/main.ts'
    },
    shared: share(
      {
        '@angular/core': {
          requiredVersion: 'auto',
          includeSecondaries: true
        },
        '@angular/common': {
          requiredVersion: 'auto',
          includeSecondaries: { skip: ['@angular/common/http/testing'] }
        },
        '@angular/common/http': {
          requiredVersion: 'auto',
          includeSecondaries: true
        },
        '@angular/elements': {
          requiredVersion: 'auto',
          includeSecondaries: true
        },
        '@angular/forms': {
          requiredVersion: 'auto',
          includeSecondaries: true
        },
        '@angular/platform-browser': {
          requiredVersion: 'auto',
          includeSecondaries: true
        },
        '@angular/router': {
          requiredVersion: 'auto',
          includeSecondaries: true
        }
      },
      './package.json'
    )
  })
}

const plugins = webpackConfig.plugins.filter((plugin) => !(plugin instanceof ModifyEntryPlugin))

module.exports = {
  ...webpackConfig,
  plugins,
  output: { uniqueName: 'onecx-dummy-loader-angular-18', publicPath: 'auto' },
  experiments: { ...webpackConfig.experiments, topLevelAwait: true },
  optimization: { runtimeChunk: false, splitChunks: false }
}
