const {
  ModifyEntryPlugin,
} = require('@angular-architects/module-federation/src/utils/modify-entry-plugin');
const {
  share,
  withModuleFederationPlugin,
} = require('@angular-architects/module-federation/webpack');

const webpackConfig = {
  ...withModuleFederationPlugin({
    shared: share({
      '@angular/core': { requiredVersion: 'auto', includeSecondaries: true, eager: true, singleton: true },
      '@angular/forms': {
        requiredVersion: 'auto',
        includeSecondaries: true,
        eager: true,
        singleton: true
      },
      '@angular/common': {
        requiredVersion: 'auto',
        includeSecondaries: {
          skip: ['@angular/common/http/testing'],
        },
        eager: true,
        singleton: true
      },
      '@angular/common/http': {
        requiredVersion: 'auto',
        includeSecondaries: true,
        eager: true,
        singleton: true
      },
      '@angular/router': {
        requiredVersion: 'auto',
        includeSecondaries: true,
        eager: true,
        singleton: true
      },
      rxjs: { requiredVersion: 'auto', includeSecondaries: true, eager: true },
      '@ngx-translate/core': {
        singleton: true,
        strictVersion: false,
        requiredVersion: '^14.0.0',
        eager: true
      },
      '@onecx/portal-integration-angular': {
        requiredVersion: 'auto',
        includeSecondaries: true,
        eager: true
      },
    }),

    sharedMappings: ['@onecx/portal-integration-angular'],
  }),
};
const plugins = webpackConfig.plugins.filter(
  (plugin) => !(plugin instanceof ModifyEntryPlugin)
);

module.exports = {
  ...webpackConfig,
  plugins,
};
