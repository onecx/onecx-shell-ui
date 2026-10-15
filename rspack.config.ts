/**
 * Rspack configuration for the OneCX shell.
 *
 * Replaces the former `@nx/angular:webpack-browser` build (and its
 * `webpack.config.ts` `withModuleFederation` wrapper). The Angular-specific parts are produced
 * by `createConfig` from `@nx/angular-rspack`; this file then layers on the pieces that were
 * previously supplied by `webpack.config.ts` / the Nx module-federation wrapper:
 *
 *   - Module Federation, configured DIRECTLY with `@module-federation/enhanced/rspack`
 *     (the deprecated `@nx/angular/module-federation` wrapper is gone). The container name,
 *     `exposes` and `shared` map are reconstructed by hand — see `module-federation.config.ts`.
 *   - The two `ModifySourcePlugin` source patches (PrimeNG + Angular `SharedStylesHost`),
 *     reimplemented as the `modify-source-loader.cjs` source-string transform loader.
 *   - ESM output (`output.module` / `scriptType: module`) and `importMeta: false`, so the
 *     shell's `import.meta.url` (used for i18n asset paths) is preserved as a real ESM literal.
 *
 * Configuration selection (`production` / `development` / `local-env`) is driven by the
 * `NGRS_CONFIG` / `WEBPACK_SERVE` environment variables exactly as `@nx/angular-rspack`'s
 * `createConfig` expects: `nx build` → production, `nx serve` → development (the dev server
 * sets `WEBPACK_SERVE`), `nx serve --configuration=local-env` → local-env (the `local-env`
 * serve configuration sets `NGRS_CONFIG=local-env`).
 */
import { createConfig } from '@nx/angular-rspack'
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack'
import { workspaceRoot } from '@nx/devkit'
import * as path from 'node:path'
import * as mfConfig from './module-federation.config'

// Derive the exact option types from `createConfig`'s signature (they are not re-exported by name).
type BuildOptions = Parameters<typeof createConfig>[0]['options']
type ConfigurationMap = NonNullable<Parameters<typeof createConfig>[1]>

const baseOptions: BuildOptions = {
  root: __dirname,
  // Emit to a flat `dist/onecx-shell-ui/` (the `Dockerfile` and `copy-preloaders.sh` both expect
  // this path without a `browser/` sub-directory). `browser: '.'` keeps the browser output in the
  // base directory while `createConfig` still computes a (unused) server/media path.
  outputPath: { base: 'dist/onecx-shell-ui', browser: '.' },
  index: './src/index.html',
  browser: './src/main.ts',
  polyfills: ['zone.js'],
  tsConfig: './tsconfig.app.json',
  inlineStyleLanguage: 'scss',
  assets: [
    'src/favicon.ico',
    './src/assets',
    {
      glob: '**/*',
      input: './pre_loaders/angular-18/node_modules/@onecx/portal-integration-angular/assets/',
      output: '/onecx-portal-lib/assets/'
    },
    {
      glob: '**/*',
      input: './node_modules/@onecx/angular-accelerator/assets/',
      output: '/onecx-angular-accelerator/assets/'
    },
    {
      glob: '**/*',
      input: './node_modules/@onecx/angular-utils/assets/',
      output: '/onecx-angular-utils/assets/'
    },
    {
      glob: '**/*',
      input: './node_modules/@onecx/shell-core/assets/',
      output: '/onecx-shell-core/assets/'
    },
    {
      glob: '**/*',
      input: './pre_loaders/angular-18/dist/onecx-angular-18-loader',
      output: '/pre_loaders/onecx-angular-18-loader'
    },
    {
      glob: '**/*',
      input: './pre_loaders/angular-19/dist/onecx-angular-19-loader',
      output: '/pre_loaders/onecx-angular-19-loader'
    },
    {
      glob: '**/*',
      input: './pre_loaders/angular-20/dist/onecx-angular-20-loader',
      output: '/pre_loaders/onecx-angular-20-loader'
    },
    {
      glob: '**/*',
      input: './pre_loaders/angular-21/dist/onecx-angular-21-loader',
      output: '/pre_loaders/onecx-angular-21-loader'
    },
    {
      glob: '**/*',
      input: './pre_loaders/react-19/dist/onecx-react-19-loader',
      output: '/pre_loaders/onecx-react-19-loader'
    }
  ],
  styles: [
    { input: './src/splash.scss', inject: true },
    { input: './src/global-styles.scss', bundleName: 'global-styles', inject: true },
    { input: './src/shell-styles.scss', bundleName: 'shell-styles', inject: false },
    { input: './src/portal-layout-styles.scss', bundleName: 'portal-layout-styles', inject: false }
  ],
  sourceMap: { scripts: true, styles: false, vendor: true, hidden: false },
  scripts: [],
  devServer: {
    hmr: false,
    port: 4300,
    proxyConfig: 'proxy.conf.js'
  }
}

const configurations: ConfigurationMap = {
  production: {
    options: {
      budgets: [
        { type: 'initial', maximumWarning: '1mb', maximumError: '5mb' },
        { type: 'anyComponentStyle', maximumWarning: '2kb', maximumError: '4kb' }
      ],
      sourceMap: { scripts: true, styles: false, vendor: true, hidden: false },
      outputHashing: 'all',
      // `createConfig` extracts third-party licenses with `license-webpack-plugin`, which reads
      // `fs.readdir(module.directory)` for every module. Module Federation's virtual modules have
      // no real directory (`module.directory === ''`), which makes that plugin throw
      // `ENOENT ... scandir ''` and abort the build. The former webpack build used Angular's own
      // (MF-tolerant) extractor instead. `3rdpartylicenses.txt` is not referenced by the shell,
      // nginx config or Dockerfile, so license extraction is disabled for the Rspack build.
      extractLicenses: false
    }
  },
  development: {
    options: {
      optimization: false,
      vendorChunk: true,
      extractLicenses: false,
      sourceMap: true,
      namedChunks: true
    }
  },
  'local-env': {
    options: {
      baseHref: '/onecx-shell/',
      outputHashing: 'all',
      devServer: {
        host: '0.0.0.0',
        disableHostCheck: true,
        publicHost: 'http://localhost:4300/onecx-shell/',
        port: 4300,
        proxyConfig: 'proxy.local-env.conf.js'
      }
    }
  }
}

export default async () => {
  const configs = await createConfig({ options: baseOptions }, configurations)
  const browserConfig: any = configs[0]

  // Nx loads this config again while creating the project graph (a stub call, no real build).
  // The MF plugin and the hand-built `shared` map are not needed then and would force a project
  // graph read mid-creation, so return the base config early.
  if ((global as any).NX_GRAPH_CREATION) {
    return browserConfig
  }

  // ESM output. `createConfig` only enables it when not the dev server, but the shell relies on
  // `import.meta.url` (i18n asset paths) and an ESM federation entry in both build and serve, so
  // force it unconditionally. `publicPath: 'auto'` lets the federation runtime resolve its
  // remote entry location at load time.
  browserConfig.experiments = { ...browserConfig.experiments, outputModule: true }
  browserConfig.output = {
    ...browserConfig.output,
    module: true,
    scriptType: 'module',
    chunkFormat: 'module',
    chunkLoading: 'import',
    workerChunkLoading: 'import',
    publicPath: 'auto'
  }

  // No separate runtime chunk (matches the former module-federation wrapper behaviour).
  browserConfig.optimization = { ...browserConfig.optimization, runtimeChunk: false }

  // The shell imports via `src/...` (see `tsconfig.json` `paths`), so the workspace root must be
  // a resolvable root.
  browserConfig.resolve = {
    ...browserConfig.resolve,
    modules: [...(browserConfig.resolve?.modules ?? []), workspaceRoot]
  }

  browserConfig.module = {
    ...browserConfig.module,
    parser: {
      ...browserConfig.module?.parser,
      // Keep `import.meta.url` as a real ESM literal so `provideTranslationPathFromMeta` resolves
      // the i18n asset directory in the browser. (Rspack's default rewrites it to a `file://` URL.)
      javascript: { ...browserConfig.module?.parser?.javascript, importMeta: false }
    },
    rules: [
      {
        enforce: 'pre',
        test: /\.m?js$/,
        // Mirror the original `ModifySourcePlugin` `module.resource.includes(...)` guards exactly.
        include: (resourcePath: string) =>
          resourcePath.includes('primeng') || resourcePath.includes('@angular/platform-browser'),
        use: [{ loader: path.join(__dirname, 'modify-source-loader.cjs') }]
      },
      ...(browserConfig.module?.rules ?? [])
    ]
  }

  browserConfig.plugins = [
    ...(browserConfig.plugins ?? []),
    new ModuleFederationPlugin({
      name: mfConfig.name,
      filename: mfConfig.filename,
      exposes: mfConfig.exposes,
      shared: await mfConfig.getShared(),
      library: mfConfig.library,
      shareScope: mfConfig.shareScope,
      // The exposed module is a side-effectful dynamic `import()` bootstrap
      // (`shell-toast.component.main.ts`), not a typed API surface, and the former
      // `withModuleFederation` wrapper never generated MF type declarations. Disable the
      // enhanced plugin's auto DTS generation so the Rspack build behaves like the old webpack
      // build (DTS generation also runs a tsc compile of the exposed module that is not part of
      // this app's build contract).
      dts: false
    })
  ]

  return browserConfig
}
