const { ModifyEntryPlugin } = require('@angular-architects/module-federation/src/utils/modify-entry-plugin')
const { share, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack')
const { ModifySourcePlugin, ReplaceOperation } = require('modify-source-webpack-plugin')

const shareScope = 'angular-20'

const webpackConfig = {
  ...withModuleFederationPlugin({
    name: 'onecx-shell-ui',
    exposes: {
      './OneCXVersionInfoComponent': 'src/app/remotes/version-info/version-info.component.main.ts',
      './OneCXShellToastComponent': 'src/app/remotes/shell-toast/shell-toast.component.main.ts'
    },
    shared: share({
      '@angular/core': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@angular/common': {
        requiredVersion: 'auto',
        includeSecondaries: { skip: ['@angular/common/http/testing'] },
        shareScope 
      },
      '@angular/common/http': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@angular/elements': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@angular/forms': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@angular/platform-browser': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@angular/router': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@angular-architects/module-federation-tools': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@ngx-translate/core': { requiredVersion: 'auto', shareScope },
      '@ngx-translate/http-loader': { requiredVersion: 'auto', shareScope },
      primeng: { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      rxjs: { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@onecx/accelerator': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@onecx/angular-accelerator': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@onecx/angular-auth': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@onecx/angular-integration-interface': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@onecx/angular-remote-components': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@onecx/angular-utils': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@onecx/angular-webcomponents': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@onecx/integration-interface': { requiredVersion: 'auto', includeSecondaries: true, shareScope },
      '@onecx/portal-layout-styles': { requiredVersion: 'auto', includeSecondaries: true, shareScope }
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
