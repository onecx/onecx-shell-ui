import type { Configuration } from '@rspack/core'
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
 *   - the two former `ModifySourcePlugin` patches (PrimeNG + Angular
 *     `SharedStylesHost`) are re-implemented as a source loader
 *     (`./source-patch.loader.js`).
 *
 * The options the `@nx/rspack` executor hands to this function are forwarded
 * straight into `createConfig`, so `project.json` stays the single source of
 * truth. Only the values whose *shape* differs between the two APIs are
 * translated here (see `buildAngularRspackOptions`), plus the two options the
 * `@nx/rspack` executor schema cannot express — the `sourceMap` object form and
 * `budgets` — which are driven from the Nx `configuration`.
 *
 * Configuration mode: `createConfig`'s `configurations` map is keyed off the
 * `NGRS_CONFIG` env var, which Nx never sets, so it would fall back to
 * `WEBPACK_SERVE ? 'development' : 'production'`. We instead drive the mode from
 * the Nx `configuration` argument (`context.configurationName`, which reflects
 * `defaultConfiguration`) and set `WEBPACK_SERVE` ourselves for `serve` so the
 * config emits the dev (classic, non-module) output.
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
 * The `@nx/rspack:rspack` executor schema only accepts a boolean/string
 * `sourceMap`, so the original fine-grained `sourceMap` object (scripts + vendor
 * on, styles off) cannot live in `project.json`. It is applied here instead,
 * matching the value the original `build` target used for every non-`development`
 * configuration.
 */
const SOURCE_MAP = { scripts: true, styles: false, vendor: true, hidden: false }

/**
 * Production budgets. The `@nx/rspack:rspack` executor schema has no `budgets`
 * option, so they cannot live in `project.json` and are enforced here instead
 * (the original `build:production` configuration enforced these same values).
 */
const PRODUCTION_BUDGETS = [
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

/**
 * Extract the path portion an Angular `baseHref` contributes to a public host
 * (always with a leading slash), so a derived dev-server `publicHost` can fold
 * the build's base path (e.g. the `local-env` configuration's `/onecx-shell/`)
 * into its URL. An empty/absent `baseHref` yields `/`, the no-base-path default.
 */
function publicHostPath(baseHref: string | undefined): string {
  if (typeof baseHref !== 'string' || !baseHref) {
    return '/'
  }
  // Strip a scheme+host prefix if the baseHref is a full URL, then keep the
  // path portion.
  const path = baseHref.replace(/^https?:\/\/[^/]+/, '')
  return path.startsWith('/') ? path : `/${path}`
}

/**
 * Assemble the `@nx/angular-rspack` `createConfig` options for a given Nx
 * configuration.
 *
 * `options` here is the `@nx/rspack` executor's normalized options. For a `serve`
 * task it additionally carries `devServer` — the dev-server target's resolved
 * options (host / port / publicHost / proxy) — and we forward host / port /
 * publicHost so that `createConfig`'s own dev-server config (which wins the
 * `@nx/rspack:dev-server` merge over the executor's) matches the original
 * dev-server behaviour. The resolved proxy is forwarded separately, after
 * `createConfig`, because `createConfig` only resolves a proxy from a
 * `devServer.proxyConfig` path and this config no longer pins one.
 */
function buildAngularRspackOptions(options: any, configuration: string | undefined) {
  // Rspack dev-server options. For a `serve` task, forward the resolved host /
  // port / publicHost so the merged result is preserved (the resolved proxy is
  // handled after `createConfig`, which cannot take a pre-resolved proxy object).
  const serveDevServer = options?.devServer
  const devServer: Record<string, any> = {
    hmr: false,
    liveReload: true,
    port: 4300
  }
  if (serveDevServer) {
    devServer.host = serveDevServer.host
    devServer.port = serveDevServer.port ?? devServer.port
    if (serveDevServer.client?.webSocketURL) {
      devServer.publicHost = serveDevServer.client.webSocketURL
    } else {
      // The executor only populates `client.webSocketURL` from the dev-server's
      // `publicHost` option (set by the `local-env` configuration). When it is
      // absent, derive a public host from the resolved host + port + base path so
      // the browser's WebSocket/HMR reconnect target stays valid. A `0.0.0.0`
      // interface is reached from the browser via `localhost`, and an unset host
      // defaults to `localhost` as well. The build's `baseHref` path (e.g. the
      // `local-env` `/onecx-shell/`) is folded into the URL so the derived
      // publicHost matches the original dev-server value
      // (`http://localhost:4300/onecx-shell/`), not just the bare origin.
      const publicHostHost =
        serveDevServer.host && serveDevServer.host !== '0.0.0.0' ? serveDevServer.host : 'localhost'
      const publicHostPort = serveDevServer.port ?? devServer.port
      devServer.publicHost = `http://${publicHostHost}:${publicHostPort}${publicHostPath(options?.baseHref)}`
    }
    // Faithful to the original `disableHostCheck: true` (local-env, which binds to
    // `0.0.0.0`). The `@nx/rspack` dev-server schema has no `disableHostCheck`, so
    // allow all hosts when serving on a non-localhost interface.
    if (serveDevServer.host === '0.0.0.0') {
      devServer.allowedHosts = true
    }
  }

  // The `@nx/rspack` executor schema declares `polyfills` as a *string*, but
  // `createConfig`'s `normalizeOptions` expects an *array* (it spreads it into the
  // polyfills entry). Convert the string to a single-element array; leave a real
  // array untouched.
  const polyfills = Array.isArray(options?.polyfills)
    ? options.polyfills
    : options?.polyfills
      ? [options.polyfills]
      : ['zone.js']

  return {
    root: __dirname,
    // `main` (`@nx/rspack` executor option) -> `browser` (`createConfig` option).
    browser: options?.main ?? './src/main.ts',
    index: options?.index ?? './src/index.html',
    tsConfig: options?.tsConfig ?? './tsconfig.app.json',
    polyfills,
    // The `@nx/rspack` schema has no `inlineStyleLanguage`; the global styles are
    // SCSS, so pin it here (the original build set it explicitly).
    inlineStyleLanguage: 'scss',
    // Flat output: `browser: '.'` writes directly to `dist/onecx-shell-ui`, which
    // the Dockerfile `COPY dist/onecx-shell-ui/` depends on (a plain string would
    // nest it under `dist/onecx-shell-ui/browser`).
    outputPath: { base: options?.outputPath ?? 'dist/onecx-shell-ui', browser: '.' },
    // Forward the real asset / style / script sets from `project.json` (the
    // `@nx/rspack` executor has already normalized `assets` to absolute inputs).
    assets: options?.assets ?? [],
    styles: options?.styles ?? [],
    scripts: options?.scripts ?? [],
    // The options below are forwarded verbatim from `project.json` (schema-valid
    // for `@nx/rspack`); `createConfig` normalizes them the same way the Angular
    // build does. `optimization` is already an object after the executor's
    // normalization, which `createConfig` resolves to the correct per-configuration
    // behaviour (optimized for production, not for development).
    baseHref: options?.baseHref,
    outputHashing: options?.outputHashing,
    optimization: options?.optimization,
    vendorChunk: options?.vendorChunk,
    namedChunks: options?.namedChunks,
    extractLicenses: options?.extractLicenses,
    // The `@nx/rspack` schema only accepts a boolean/string `sourceMap`, so the
    // original fine-grained value cannot live in `project.json`; it is applied per
    // configuration here (object form for the non-development configs, all-on for
    // development — matching the original).
    sourceMap: configuration === 'development' ? true : SOURCE_MAP,
    budgets: configuration === 'production' ? PRODUCTION_BUDGETS : undefined,
    devServer
  }
}

/**
 * Nx Rspack config entry point.
 *
 * Invoked as `userDefinedConfig(baseConfig, { options, context, configuration })`
 * where `configuration` is `context.configurationName` (which reflects
 * `defaultConfiguration`).
 */
export default async (_baseConfig: Configuration, { options, configuration }: any) => {
  // Set before `createConfig` runs so it emits the classic (non-module)
  // development output the dev server expects. `@nx/rspack:dev-server` sets it
  // too, but only after this config file has already been loaded.
  if (Boolean(options?.devServer)) {
    process.env.WEBPACK_SERVE = 'true'
  }

  const angularOptions = buildAngularRspackOptions(options, configuration)
  const [browserConfig] = await createConfig({ options: angularOptions })
  const { shared, sharedLibraries } = await buildSharedMap()

  // Forward the resolved proxy the `@nx/rspack:dev-server` executor computed from
  // the resolved `proxyConfig` (per-configuration / CLI). `createConfig` resolves
  // the proxy only from a `devServer.proxyConfig` path and this config no longer
  // pins one, so its `devServer.proxy` would be `undefined` — which the dev-server
  // executor's merge (the config's devServer wins) would then drop. Setting the
  // resolved object here preserves whichever proxy file the current serve run used
  // (`proxy.conf.js` for the default/development configs,
  // `proxy.local-env.conf.js` for `local-env`).
  if (options?.devServer?.proxy) {
    browserConfig.devServer ??= {}
    browserConfig.devServer.proxy = options.devServer.proxy
  }

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
        exposes: mfConfig.exposes,
        remotes: {},
        shared,
        // The original config passed `{ shareScope: 'angular_21' }` to
        // `withModuleFederation` (via `configOverride`).
        shareScope: 'angular_21',
        runtimePlugins
      },
      sharedLibraries.getReplacementPlugin()
    )
  )

  // The env var is only set from the module-federation-dev-server; attach the
  // runtime plugin (matches the original wrapper).
  browserConfig.plugins.push(new DefinePlugin({ 'process.env.NX_MF_DEV_REMOTES': process.env.NX_MF_DEV_REMOTES }))

  // --- Source patches (PrimeNG + Angular SharedStylesHost) as a source loader ---
  // Re-implements the two former `ModifySourcePlugin` patches.
  browserConfig.module.rules.push({
    test: /[\/\\]node_modules[\/\\](primeng|@angular[\/\\]platform-browser)[\/\\]/,
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
