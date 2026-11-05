import type { Compilation, Compiler, Configuration } from '@rspack/core'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { DefinePlugin } from '@rspack/core'
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack'
import { createConfig } from '@nx/angular-rspack'
import {
  applySharedFunction,
  getDependentPackagesForProject,
  normalizeProjectName,
  sharePackages,
  shareWorkspaceLibraries
} from '@nx/module-federation'
import { createProjectGraphAsync, readCachedProjectGraph, workspaceRoot } from '@nx/devkit'
import mfConfig from './module-federation.config'

/**
 * Rspack build config for onecx-shell-ui.
 *
 * Replaces the previous `webpack.config.ts`, which used the deprecated
 * `@nx/angular/module-federation` `withModuleFederation` wrapper together with
 * two `ModifySourcePlugin` source patches, with the Nx Rspack migration path:
 *
 *   - the Angular base config comes from `@nx/angular-rspack`'s `createConfig`
 *     (the `convert-to-rspack` path);
 *   - Module Federation is applied **directly** with
 *     `@module-federation/enhanced/rspack`'s `ModuleFederationPlugin`,
 *     reconstructing `exposes` / `shared` / the container name by hand (mirroring
 *     `@nx/module-federation`'s Rspack `withModuleFederation` wrapper, whose
 *     deprecated `@nx/angular/module-federation` variant this replaces);
 *   - the two former `ModifySourcePlugin` patches (Optimus UI + Angular
 *     `SharedStylesHost`) are re-implemented as a source loader
 *     (`./source-patch.loader.js`).
 *
 * The inferred targets run the standard Rspack CLI. Build options live here;
 * Nx's task configuration selects production, development, or local-env.
 * `WEBPACK_SERVE` is cleared while creating Angular's config so the dev server
 * also gets ES module output.
 */

/**
 * Angular's default Module Federation shared packages, copied from
 * `@nx/module-federation`'s Angular framework config
 * (`DEFAULT_ANGULAR_PACKAGES_TO_SHARE`).
 */
const DEFAULT_ANGULAR_PACKAGES_TO_SHARE = ['@angular/core', '@angular/animations', '@angular/common']

/**
 * Npm packages excluded from the shared map, copied from
 * `@nx/module-federation`'s Angular framework config
 * (`DEFAULT_NPM_PACKAGES_TO_AVOID`).
 */
const NPM_PACKAGES_TO_AVOID = ['zone.js', '@nx/angular/mf', '@nrwl/angular/mf', '@nx/angular-rspack']

/**
 * `@angular/localize` eager-shared — mirrors `applyDefaultEagerPackages` with
 * `useRspack = false`, the path the original Angular framework config used (the
 * Rspack eager-extra package list is not applied because the app used the Angular,
 * not Rspack, MF path).
 */
const DEFAULT_PACKAGES_TO_LOAD_EAGERLY = ['@angular/localize', '@angular/localize/init']

/**
 * Preserve script/vendor source maps for non-development configurations.
 */
const SOURCE_MAP = { scripts: true, styles: false, vendor: true, hidden: false }

/**
 * Preserve the original production budgets.
 */
const PRODUCTION_BUDGETS: NonNullable<Parameters<typeof createConfig>[0]['options']['budgets']> = [
  { type: 'initial', maximumWarning: '1mb', maximumError: '5mb' },
  { type: 'anyComponentStyle', maximumWarning: '2kb', maximumError: '4kb' }
]

/**
 * Reconstruct the Module Federation shared map exactly the way
 * `@nx/module-federation`'s `buildModuleFederationConfig` does for the Angular
 * framework (see `module-federation-config.js`), so the shared map matches the
 * pre-migration behaviour.
 */
async function buildSharedMap() {
  let projectGraph
  try {
    projectGraph = readCachedProjectGraph()
  } catch {
    projectGraph = await createProjectGraphAsync()
  }

  const project = projectGraph.nodes[mfConfig.name]?.data
  if (!project) {
    throw Error(`Cannot find project "${mfConfig.name}". Check that the name is correct in module-federation.config.js`)
  }

  const dependencies = getDependentPackagesForProject(projectGraph, mfConfig.name)

  // Filter dependencies through the shared function (matching the framework path).
  if (mfConfig.shared) {
    dependencies.workspaceLibraries = dependencies.workspaceLibraries.filter(
      (lib) => mfConfig.shared(lib.importKey, {}) !== false
    )
    dependencies.npmPackages = dependencies.npmPackages.filter((pkg) => mfConfig.shared(pkg, {}) !== false)
  }

  const sharedLibraries = shareWorkspaceLibraries(dependencies.workspaceLibraries, undefined, 'rspack')

  const npmPackages = sharePackages(
    Array.from(
      new Set([
        ...DEFAULT_ANGULAR_PACKAGES_TO_SHARE,
        ...dependencies.npmPackages.filter((pkg) => !NPM_PACKAGES_TO_AVOID.includes(pkg))
      ])
    )
  )

  for (const pkgName of NPM_PACKAGES_TO_AVOID) {
    if (pkgName in npmPackages) {
      delete npmPackages[pkgName]
    }
  }

  const shared = {
    ...sharedLibraries.getLibraries(project.root),
    ...npmPackages
  }

  // Apply the Angular eager defaults (useRspack = false).
  for (const pkg of DEFAULT_PACKAGES_TO_LOAD_EAGERLY) {
    if (!shared[pkg]) {
      continue
    }
    shared[pkg] = { ...shared[pkg], eager: true }
  }

  // The OneCX shared-recommendations function runs last (matching the framework
  // path) and returns the final shared map.
  applySharedFunction(shared, mfConfig.shared)

  return { shared, sharedLibraries }
}

function buildAngularRspackOptions(configuration: string): Parameters<typeof createConfig>[0]['options'] {
  const development = configuration === 'development'
  const localEnv = configuration === 'local-env'
  return {
    root: __dirname,
    browser: './src/main.ts',
    index: './src/index.html',
    tsConfig: './tsconfig.app.json',
    polyfills: ['zone.js'],
    inlineStyleLanguage: 'scss',
    outputPath: { base: 'dist/onecx-shell-ui', browser: '.' },
    assets: [
      './src/assets',
      {
        glob: '**/*',
        input: './pre_loaders/angular-18/node_modules/@onecx/portal-integration-angular/assets/',
        output: '/onecx-portal-lib/assets/'
      },
      ...['angular-accelerator', 'angular-utils', 'shell-core'].map((name) => ({
        glob: '**/*',
        input: `./node_modules/@onecx/${name}/assets/`,
        output: `/onecx-${name}/assets/`
      })),
      ...['angular-18', 'angular-19', 'angular-20', 'angular-21', 'angular-22', 'react-19'].map((name) => ({
        glob: '**/*',
        input: `./pre_loaders/${name}/dist/onecx-${name}-loader`,
        output: `/pre_loaders/onecx-${name}-loader`
      }))
    ],
    styles: [
      { input: './src/splash.scss', inject: true },
      { input: './src/global-styles.scss', bundleName: 'global-styles', inject: true },
      { input: './src/shell-styles.css', bundleName: 'shell-styles', inject: false },
      { input: './src/portal-layout-styles.scss', bundleName: 'portal-layout-styles', inject: false }
    ],
    scripts: [],
    baseHref: localEnv ? '/onecx-shell/' : undefined,
    outputHashing: development ? 'none' : localEnv ? 'media' : 'all',
    optimization: !development,
    vendorChunk: development,
    namedChunks: development,
    extractLicenses: false,
    sourceMap: development ? true : SOURCE_MAP,
    budgets: configuration === 'production' ? PRODUCTION_BUDGETS : undefined,
    devServer: {
      hmr: false,
      liveReload: true,
      port: 5000,
      host: localEnv ? '0.0.0.0' : 'localhost',
      allowedHosts: localEnv ? true : undefined,
      publicHost: localEnv ? 'http://localhost:5000/onecx-shell/' : undefined,
      proxyConfig: localEnv ? 'proxy.local-env.conf.js' : 'proxy.conf.js'
    }
  }
}

/**
 * Standard Rspack CLI config entry point.
 */
// Drops the JS output of entries that only contain stylesheets. Nx's
// `SuppressJsForCssOnlyEntryPlugin` reads `module.resourceResolveData`, which
// Rspack 1.x does not provide, so it never matches and the empty style-entry
// JS (which carries `import.meta` from the MF runtime) was still emitted and
// loaded as a classic script. Use Angular's explicit global-style entry names.
class SuppressJsForCssOnlyEntryPlugin {
  constructor(private readonly styleEntries: Set<string>) {}

  apply(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap('SuppressJsForCssOnlyEntryPlugin', (compilation: Compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'SuppressJsForCssOnlyEntryPlugin',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE - 1
        },
        () => {
          for (const chunk of compilation.chunks) {
            if (!this.styleEntries.has(chunk.name ?? '')) continue
            const cssFiles = [...chunk.files].filter((f) => f.endsWith('.css'))
            const jsFiles = [...chunk.files].filter((f) => f.endsWith('.js'))
            if (cssFiles.length === 0 || jsFiles.length !== 1) continue
            compilation.deleteAsset(jsFiles[0])
            chunk.files.delete(jsFiles[0])
          }
        }
      )
    })
  }
}

export default async (env: { production?: boolean; configuration?: string } = {}) => {
  const configuration =
    env.configuration ??
    process.env['NX_TASK_TARGET_CONFIGURATION'] ??
    (env.production || process.env['NODE_ENV'] === 'production' ? 'production' : 'development')
  if (!['production', 'development', 'local-env'].includes(configuration)) {
    throw new Error(`Unknown Rspack configuration: ${configuration}`)
  }
  // Inference only needs output metadata; creating the full config here would
  // recursively request the project graph from buildSharedMap.
  if ((globalThis as typeof globalThis & { NX_GRAPH_CREATION?: boolean }).NX_GRAPH_CREATION) {
    return { output: { path: join(__dirname, 'dist/onecx-shell-ui') }, devServer: { port: 4300 } }
  }
  process.env['NG_BUILD_PARALLEL_TS'] ??= 'false'

  // Nx's in-process compilation bypasses Angular 22's hash initialization.
  // Resolve from the compiler so a second installed @angular/build is not initialized instead.
  const rspackRequire = createRequire(require.resolve('@nx/angular-rspack'))
  const compilerRequire = createRequire(rspackRequire.resolve('@nx/angular-rspack-compiler'))
  const angularBuildRoot = dirname(compilerRequire.resolve('@angular/build/package.json'))
  const { initializeHash }: { initializeHash: () => Promise<void> } = compilerRequire(
    join(angularBuildRoot, 'src/utils/hash.js')
  )
  const { shutdownSassWorkerPool }: { shutdownSassWorkerPool: () => void } = compilerRequire(
    join(angularBuildRoot, 'src/tools/esbuild/stylesheets/sass-language.js')
  )
  await initializeHash()

  // `@rspack/dev-server` sets `WEBPACK_SERVE` before this file loads, and while it
  // is set `createConfig` emits classic (non-module) output, which cannot contain
  // `import.meta` (used by @onecx/angular-utils). Clear it only for `createConfig`.
  const angularOptions = buildAngularRspackOptions(configuration)
  const webpackServe = process.env.WEBPACK_SERVE
  delete process.env.WEBPACK_SERVE
  let browserConfig: Configuration
  try {
    ;[browserConfig] = await createConfig({ options: angularOptions })
  } finally {
    if (webpackServe !== undefined) {
      process.env.WEBPACK_SERVE = webpackServe
    }
  }
  // Replace Nx's plugin (see SuppressJsForCssOnlyEntryPlugin above).
  browserConfig.plugins = browserConfig.plugins.filter(
    (plugin) => plugin?.constructor?.name !== 'SuppressJsForCssOnlyEntryPlugin'
  )
  const styleEntries = new Set(
    Object.entries(browserConfig.entry ?? {})
      .filter(([, entry]) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false
        return (
          Array.isArray(entry.import) &&
          entry.import.length > 0 &&
          entry.import.every((input) => input.endsWith('?ngGlobalStyles'))
        )
      })
      .map(([name]) => name)
  )
  browserConfig.plugins.push(new SuppressJsForCssOnlyEntryPlugin(styleEntries))
  // Angular's application builder normally shuts down this shared pool.
  browserConfig.plugins.push({
    apply(compiler) {
      compiler.hooks.shutdown.tap('ShutdownAngularSassWorkerPool', shutdownSassWorkerPool)
    }
  })
  const { shared, sharedLibraries } = await buildSharedMap()

  // --- Module Federation (direct, via @module-federation/enhanced/rspack) ---
  // Mirrors `@nx/module-federation`'s Rspack `withModuleFederation` wrapper.
  browserConfig.output.uniqueName = mfConfig.name
  browserConfig.output.publicPath = 'auto'

  browserConfig.resolve ??= {}
  browserConfig.resolve.modules = [...(browserConfig.resolve.modules ?? ['node_modules']), workspaceRoot]

  // The container has `exposes`, so the standalone runtime chunk is disabled
  // (matches the original wrapper, which forced `runtimeChunk: false` for a
  // container with exposes).
  browserConfig.optimization = {
    ...(browserConfig.optimization ?? {}),
    runtimeChunk: false
  }

  const runtimePlugins =
    process.env.NX_MF_DEV_REMOTES && !mfConfig.disableNxRuntimeLibraryControlPlugin
      ? [require.resolve('@nx/module-federation/src/utils/plugins/runtime-library-control.plugin.js')]
      : undefined

  browserConfig.plugins.push(
    new ModuleFederationPlugin(
      {
        name: normalizeProjectName(mfConfig.name),
        filename: 'remoteEntry.js',
        library: { type: 'module' },
        dev: {
          disableHotTypesReload: true,
          disableDynamicRemoteTypeHints: true
        },
        exposes: mfConfig.exposes,
        remotes: {},
        shared,
        // The Angular 22 config passes `{ shareScope: 'angular_22' }` to
        // `withModuleFederation` (via `configOverride`).
        shareScope: 'angular_22',
        runtimePlugins
      },
      sharedLibraries.getReplacementPlugin()
    )
  )

  // The env var is only set from the module-federation-dev-server; attach the
  // runtime plugin (matches the original wrapper).
  browserConfig.plugins.push(new DefinePlugin({ 'process.env.NX_MF_DEV_REMOTES': process.env.NX_MF_DEV_REMOTES }))

  // --- Source patches (Optimus UI + Angular SharedStylesHost) as a source loader ---
  // Re-implements the two former `ModifySourcePlugin` patches.
  browserConfig.module.rules.push({
    test: /[\/\\]node_modules[\/\\](@openng[\/\\]optimus-ui|@angular[\/\\]platform-browser)[\/\\]/,
    enforce: 'pre',
    loader: require.resolve('./source-patch.loader.js')
  })

  // `createConfig` emits source maps via `SourceMapDevToolPlugin` (driven by the
  // `sourceMap` option above), so no `devtool` is set here. Preserve the two
  // `webpack.config.ts` behaviours `createConfig` does not set.
  browserConfig.module.parser = {
    ...browserConfig.module.parser,
    javascript: {
      ...(browserConfig.module.parser?.javascript ?? {}),
      importMeta: false
    }
  }

  return browserConfig
}
