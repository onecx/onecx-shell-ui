const {
  ModifyEntryPlugin,
} = require('@angular-architects/module-federation/src/utils/modify-entry-plugin');
const {
  share,
  withModuleFederationPlugin,
} = require('@angular-architects/module-federation/webpack');

// const config = withModuleFederationPlugin({
//   shared: share({
//     '@angular/core': {
//       requiredVersion: 'auto',
//       includeSecondaries: true,
//       // eager: true
//     },
//     '@angular/forms': {
//       requiredVersion: 'auto',
//       includeSecondaries: true,
//       // eager: true
//     },
//     '@angular/common': {
//       requiredVersion: 'auto',
//       includeSecondaries: {
//         skip: ['@angular/common/http/testing'],
//       },
//       // eager: true
//     },
//     '@angular/common/http': {
//       requiredVersion: 'auto',
//       includeSecondaries: true,
//       // eager: true
//     },
//     '@angular/router': {
//       requiredVersion: 'auto',
//       includeSecondaries: true,
//       // eager: true
//     },
//     rxjs: {
//       requiredVersion: 'auto',
//       includeSecondaries: true,
//       // eager: true
//     },
//     '@onecx/portal-integration-angular': {
//       requiredVersion: 'auto',
//       includeSecondaries: true,
//       // eager: true
//     },
//     // '@onecx/shell-core': {
//     //   requiredVersion: 'auto',
//     //   includeSecondaries: true,
//     // },
//     '@ngx-translate/core': {
//       singleton: true,
//       strictVersion: false,
//       requiredVersion: '^14.0.0',
//       // eager: true
//     },
//   }),

//   sharedMappings: ['@onecx/portal-integration-angular'],
// });

// module.exports = config;

const webpackConfig = {
  ...withModuleFederationPlugin({
    shared: share({
      '@angular/core': { requiredVersion: 'auto', includeSecondaries: true, eager: true },
      '@angular/forms': {
        requiredVersion: 'auto',
        includeSecondaries: true,
        eager: true
      },
      '@angular/common': {
        requiredVersion: 'auto',
        includeSecondaries: {
          skip: ['@angular/common/http/testing'],
        },
        eager: true
      },
      '@angular/common/http': {
        requiredVersion: 'auto',
        includeSecondaries: true,
        eager: true
      },
      '@angular/router': {
        requiredVersion: 'auto',
        includeSecondaries: true,
        eager: true,
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
