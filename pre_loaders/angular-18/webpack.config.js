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
        },
        '@ngx-translate/core': { requiredVersion: 'auto' },
        '@onecx/integration-interface': { requiredVersion: 'auto', includeSecondaries: true },
        '@onecx/accelerator': { requiredVersion: 'auto', includeSecondaries: true },
        '@onecx/angular-integration-interface': { requiredVersion: 'auto', includeSecondaries: true },
        '@onecx/angular-remote-components': { requiredVersion: 'auto', includeSecondaries: true },
        '@onecx/angular-utils': { requiredVersion: 'auto', includeSecondaries: true }
        // TODO: Enable when new version of webcomponents is merged
        // '@onecx/angular-webcomponents': { requiredVersion: 'auto', includeSecondaries: true }
      },
      './package.json'
    )
  })
}

const plugins = webpackConfig.plugins.filter((plugin) => !(plugin instanceof ModifyEntryPlugin))

module.exports = {
  ...webpackConfig,
  plugins,
  output: { uniqueName: 'onecx-angular-18-loader', publicPath: 'auto' },
  experiments: { ...webpackConfig.experiments, topLevelAwait: true },
  optimization: { runtimeChunk: false, splitChunks: false }
}
