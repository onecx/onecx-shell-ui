const { ModifyEntryPlugin } = require('@angular-architects/module-federation/src/utils/modify-entry-plugin')
const { share, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack')
const { ModifySourcePlugin, ReplaceOperation } = require('modify-source-webpack-plugin')

const webpackConfig = {
  ...withModuleFederationPlugin({
    name: 'onecx-shell-ui',
    exposes: {
      './OneCXVersionInfoComponent': 'src/app/remotes/version-info/version-info.component.main.ts',
      './OneCXShellToastComponent': 'src/app/remotes/shell-toast/shell-toast.component.main.ts'
    },
    shared: share({
      '@angular/core': { requiredVersion: 'auto', includeSecondaries: true },
      '@angular/common': {
        requiredVersion: 'auto',
        includeSecondaries: { skip: ['@angular/common/http/testing'] }
      },
      '@angular/common/http': { requiredVersion: 'auto', includeSecondaries: true },
      '@angular/elements': { requiredVersion: 'auto', includeSecondaries: true },
      '@angular/forms': { requiredVersion: 'auto', includeSecondaries: true },
      '@angular/platform-browser': { requiredVersion: 'auto', includeSecondaries: true },
      '@angular/router': { requiredVersion: 'auto', includeSecondaries: true },
      '@angular-architects/module-federation-tools': { requiredVersion: 'auto', includeSecondaries: true },
      '@ngx-translate/core': { requiredVersion: 'auto' },
      primeng: { requiredVersion: 'auto', includeSecondaries: true },
      rxjs: { requiredVersion: 'auto', includeSecondaries: true },
      '@onecx/accelerator': { requiredVersion: 'auto', includeSecondaries: true },
      '@onecx/angular-accelerator': { requiredVersion: 'auto', includeSecondaries: true },
      '@onecx/angular-auth': { requiredVersion: 'auto', includeSecondaries: true },
      '@onecx/shell-auth': { requiredVersion: 'auto', includeSecondaries: true },
      '@onecx/angular-integration-interface': { requiredVersion: 'auto', includeSecondaries: true },
      '@onecx/angular-remote-components': { requiredVersion: 'auto', includeSecondaries: true },
      '@onecx/angular-utils': { requiredVersion: 'auto', includeSecondaries: true },
      '@onecx/angular-webcomponents': { requiredVersion: 'auto', includeSecondaries: true },
      '@onecx/integration-interface': { requiredVersion: 'auto', includeSecondaries: true },
      '@onecx/portal-layout-styles': { requiredVersion: 'auto', includeSecondaries: true }
    })
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

// Replace createElement only in @angular/platform-browser SharedStylesHost
const modifyAngularCorePlugin = new ModifySourcePlugin({
  rules: [
    {
      test: (module) => {
        return module.resource && module.resource.includes('@angular/platform-browser')
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

module.exports = {
  ...webpackConfig,
  plugins: [...plugins, modifyPrimeNgPlugin, modifyAngularCorePlugin],
  module: { parser: { javascript: { importMeta: false } } }
}
