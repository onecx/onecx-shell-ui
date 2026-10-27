import type { ModuleFederationRuntimePlugin } from '@module-federation/enhanced/runtime'

/**
 * Module Federation runtime plugin.
 *
 * Only applies to apps whose Module Federation runtime is built on
 * `@module-federation/enhanced` (i.e. apps that call `registerGlobalPlugins` and expose a
 * `shareScopeMap` compatible with it). Apps using a different (or no) Module Federation
 * runtime never invoke these hooks and are unaffected.
 *
 * Goal: packages belonging to the same "section" (npm scope, e.g. @angular, @onecx,
 * primeng, rxjs, ...) should all resolve to ONE consistent version across every
 * already-loaded app in the same share scope, instead of each app pinning its own
 * version independently.
 *
 * Flow:
 * - beforeInit: for the app currently initializing, record which of its shared packages
 *   belong to this plugin (allowed group + caret requiredVersion) and group them into
 *   sections. This is bookkeeping only; no version is picked here.
 * - beforeLoadShare: for the package about to be loaded, find (or reuse a cached) best
 *   already-registered candidate for its section, and force this app's requiredVersion
 *   for that package to the exact version the candidate provides.
 *
 * Candidates are matched by major version only; concrete versions are sorted locally.
 */

interface SectionAppData {
  requiredVersion: string
  packages: string[]
  packageMapping?: Record<string, string>
}

interface SectionData {
  apps: Record<string, SectionAppData>
}

interface ResolvedSection {
  candidateApp: string
  versions: Record<string, string>
}

/**
 * Global, in-memory coordination store for this plugin, attached to `window.__mfShareResolution__`.
 * It survives across every hook invocation (and every app) for the lifetime of the page, which is
 * what lets `beforeInit` build up section knowledge that `beforeLoadShare` can later reuse instead
 * of recomputing it for every package in the same section.
 *
 * Only this plugin reads and writes this store. It lives on `window` (rather than a module-level
 * variable) because Module Federation may create more than one plugin instance for the same page.
 *
 * Shape:
 * - `sections[section].apps[appName]`: bookkeeping recorded in `beforeInit` - which packages
 *   `appName` shares under `section`, and the requiredVersion declared for them.
 * - `resolved[appName][section]`: cached output of `resolveBestCandidate` for `appName`/`section`:
 *     - a `ResolvedSection` - the chosen candidate app and the exact version to use per package.
 *     - key absent - not resolved yet (no candidate exists, or alignment was deliberately skipped
 *       because this app's own version is already higher than the best candidate); the next
 *       `beforeLoadShare` call for this app/section may retry.
 * - `allowedPackageGroups`: cached runtime allowlist, loaded once via
 *   `loadAllowedPackageGroupsForMFPlugin`.
 */
interface ShareResolutionStore {
  sections: Record<string, SectionData>
  resolved: Record<string, Record<string, ResolvedSection>>
  allowedPackageGroups?: string[]
}

// Returns the shared window-level store, initializing it on first access.
function getStore(): ShareResolutionStore {
  const w = window as any
  w.__mfShareResolution__ ??= { sections: {}, resolved: {} }
  return w.__mfShareResolution__ as ShareResolutionStore
}

// Group packages by npm scope / first path segment: "@angular/core" -> "@angular", "primeng/base" -> "primeng"
function getSection(pkgName: string): string {
  return pkgName.split('/')[0]
}

/**
 * A parsed semantic version. Only the numeric major/minor/patch triplet is tracked;
 * pre-release (e.g. "-beta.1") and build metadata (e.g. "+build5") are ignored.
 */
interface Version {
  major: number
  minor: number
  patch: number
}

// Parses "^8.11.0-beta+build" -> { major: 8, minor: 11, patch: 0 }. A leading range prefix
// (e.g. "^", "~", ">=") and non-numeric parts are ignored/default to 0.
function parseVersion(version: string): Version {
  const withoutRangePrefix = version.replace(/^[^\d]+/, '')
  const [core] = withoutRangePrefix.split('+')
  const [numericCore] = core.split('-')
  const [major, minor, patch] = numericCore.split('.').map((part) => Number.parseInt(part, 10) || 0)
  return { major, minor: minor ?? 0, patch: patch ?? 0 }
}

// Compares two CONCRETE versions (not ranges). Returns <0, 0, or >0, like Array#sort comparators.
function compareVersions(a: string, b: string): number {
  const versionA = parseVersion(a)
  const versionB = parseVersion(b)
  if (versionA.major !== versionB.major) return versionA.major - versionB.major
  if (versionA.minor !== versionB.minor) return versionA.minor - versionB.minor
  return versionA.patch - versionB.patch
}

/**
 * A section's packages are normally released in lockstep with one identical requiredVersion
 * (e.g. every @onecx/* package ships the same version). This picks that common value.
 *
 * If packages in the same section ever declare different requiredVersion values, the most
 * frequently declared one wins; ties are broken by picking the highest version.
 */
function pickRequiredVersion(versions: string[]): string {
  if (versions.length === 0) return ''

  const occurrencesByVersion = new Map<string, number>()
  for (const version of versions) {
    occurrencesByVersion.set(version, (occurrencesByVersion.get(version) ?? 0) + 1)
  }

  let mostCommonVersion = ''
  let mostCommonCount = 0
  for (const [version, count] of occurrencesByVersion) {
    const isMoreCommon = count > mostCommonCount
    const isTiedButHigher = count === mostCommonCount && compareVersions(version, mostCommonVersion) > 0
    if (isMoreCommon || isTiedButHigher) {
      mostCommonVersion = version
      mostCommonCount = count
    }
  }
  return mostCommonVersion
}

/**
 * Finds the version every package this app requires in `section` should align to.
 *
 * Among versions of `pkgName` that some app has already started loading or finished loading
 * (or already has a resolved `lib`), picks the highest one that is ALSO registered (by some app)
 * for every other package this app needs in the section. This re-uses what's already on the
 * page instead of adding a new copy.
 *
 * Returns `undefined` when there is nothing to align to yet: no complete candidate is loading or
 * loaded, or this app's own provided version is already higher than the best candidate. Either
 * way the caller does not cache the result, so a later `beforeLoadShare` call may retry.
 *
 * @param appProvidedVersion the CONCRETE version `appName` itself provides for `pkgName`
 *   (e.g. "8.11.0"), not a requiredVersion range.
 */
function resolveBestCandidate(
  appName: string,
  pkgName: string,
  thisApp: SectionAppData,
  sharedScope: string,
  origin: any,
  appProvidedVersion: string
): ResolvedSection | undefined {
  // Global, cross-app state for this share scope: { [pkgName]: { [version]: SharedEntry } }.
  const shareScopeMap = origin?.shareScopeMap ?? {}
  const sharedScopeState = shareScopeMap[sharedScope] ?? {}

  // Packages THIS app needs to stay aligned within the section (recorded in beforeInit).
  const appRequiredPackages = thisApp.packages
  const requiredMajor = /\d+/.exec(thisApp.requiredVersion ?? '')?.[0]

  const loadingOrLoadedCandidates = Object.entries(sharedScopeState[pkgName] ?? {})
    .filter(
      ([, registeredShare]: [string, any]) =>
        registeredShare?.from && (registeredShare.loaded || registeredShare.loading || registeredShare.lib)
    )
    .map(([version, registeredShare]: [string, any]) => ({ version, from: registeredShare.from as string }))
    .filter((candidate) => !requiredMajor || String(parseVersion(candidate.version).major) === requiredMajor)
    .sort((a, b) => compareVersions(b.version, a.version))

  let bestCandidate: (ResolvedSection & { version: string }) | undefined
  for (const candidate of loadingOrLoadedCandidates) {
    const candidateCoversAllRequiredPackages = appRequiredPackages.every(
      (pkg) => !!sharedScopeState[pkg]?.[candidate.version]
    )
    if (candidateCoversAllRequiredPackages) {
      bestCandidate = {
        candidateApp: candidate.from,
        version: candidate.version,
        versions: Object.fromEntries(appRequiredPackages.map((pkg) => [pkg, candidate.version]))
      }
      break
    }
  }

  if (!bestCandidate) return undefined

  if (appProvidedVersion && compareVersions(appProvidedVersion, bestCandidate.version) > 0) {
    console.warn(
      `[MF][VersionResolver] Skipping alignment for "${appName}"/"${pkgName}": the version this app provides ` +
        `(${appProvidedVersion}) is higher than the best already-loaded candidate (${bestCandidate.version}); ` +
        `leaving resolution to Module Federation.`
    )
    return undefined
  }

  return { candidateApp: bestCandidate.candidateApp, versions: bestCandidate.versions }
}

function hasCaretRequiredVersion(requiredVersion: unknown): requiredVersion is string {
  return typeof requiredVersion === 'string' && requiredVersion.startsWith('^')
}

// Finds this app's own entry for a shared package. `shareInfo[pkgName]` can list several apps.
function findAppShareEntry(entries: any, appName: string): any {
  const list = Array.isArray(entries) ? entries : [entries]
  return list.find((entry: any) => entry?.from === appName)
}

interface CollectedSectionData {
  versions: string[]
  packages: string[]
  packageMapping: Record<string, string>
}

/**
 * `beforeInit` runs once per app, as it registers its shared config with Module Federation.
 * Its ONLY job is bookkeeping: for each of that app's shared packages that belongs to an
 * allowed group and declares a caret (^) requiredVersion, record which section it belongs to
 * and what this app declared for it. No version is picked and no shared config is mutated here;
 * that happens later, in `beforeLoadShare`.
 */
function collectAppSectionData(args: any, appName: string): Record<string, CollectedSectionData> {
  const shared = args?.shareInfo ?? {}
  const sectionData: Record<string, CollectedSectionData> = {}

  for (const pkgName of Object.keys(shared)) {
    if (!isPartOfAllowedPackageOrPackageGroupMFPlugin(args, pkgName)) continue

    const entry = findAppShareEntry(shared[pkgName], appName)
    if (!entry) continue

    const requiredVersion = entry.shareConfig?.requiredVersion
    if (!hasCaretRequiredVersion(requiredVersion)) {
      console.warn(
        `[ModuleFederationPlugin] Always use a caret (^) for the "${pkgName}" shared by "${appName}". Current version: "${requiredVersion}"`
      )
    }

    const section = getSection(pkgName)
    sectionData[section] ??= { versions: [], packages: [], packageMapping: {} }
    sectionData[section].packages.push(pkgName)
    sectionData[section].versions.push(requiredVersion)
    sectionData[section].packageMapping[pkgName] = requiredVersion
  }

  return sectionData
}

// Persists the per-section data collected for appName so beforeLoadShare can look it up later.
function storeAppSectionData(
  store: ShareResolutionStore,
  appName: string,
  sectionData: Record<string, CollectedSectionData>
): void {
  for (const [section, data] of Object.entries(sectionData)) {
    store.sections[section] ??= { apps: {} }
    store.sections[section].apps[appName] = {
      requiredVersion: pickRequiredVersion(data.versions),
      packages: data.packages,
      packageMapping: data.packageMapping
    }
  }
}

export default function mfRuntimePlugin(): ModuleFederationRuntimePlugin {
  const plugin: any = {
    name: 'OneCXModuleFederationPlugin',

    beforeInit(args: any) {
      try {
        const appName = args?.userOptions?.name ?? args?.origin?.name
        const store = getStore()
        const sectionData = collectAppSectionData(args, appName)
        storeAppSectionData(store, appName, sectionData)
      } catch (err) {
        console.error('[ModuleFederationPlugin] beforeInit error: ', err)
      }
      return args
    },

    /**
     * `beforeLoadShare` runs every time Module Federation is about to load a shared package.
     * For each package, it finds the best candidate version for its whole section (see
     * `resolveBestCandidate`) and caches that result per (app, section), so it is computed ONCE
     * per app/section instead of once per package. Later packages in the same section reuse the
     * cached candidate and simply look up their own exact version in it.
     */
    beforeLoadShare(args: any) {
      try {
        if (!isPartOfAllowedPackageOrPackageGroupMFPlugin(args, args.pkgName)) return args

        const pkgName: string = args.pkgName
        const appName: string = args?.origin?.options?.name ?? args?.origin?.name
        const section = getSection(pkgName)
        const store = getStore()
        const thisApp = store.sections[section]?.apps?.[appName]
        const sharedScope = args.shareInfo?.scope[0] ?? ''
        const requiredVersion = args.shareInfo?.shareConfig?.requiredVersion

        if (!thisApp || !hasCaretRequiredVersion(requiredVersion)) return args

        store.resolved[appName] ??= {}
        const hasCachedResolution = Object.hasOwn(store.resolved[appName], section)
        // args.shareInfo.version is the CONCRETE version this app provides for pkgName.
        const resolution = hasCachedResolution
          ? store.resolved[appName][section]
          : resolveBestCandidate(appName, pkgName, thisApp, sharedScope, args.origin, args.shareInfo.version)

        if (!resolution) return args
        if (!hasCachedResolution) store.resolved[appName][section] = resolution

        const exactVersion = resolution.versions[pkgName]
        if (exactVersion && exactVersion !== requiredVersion) {
          args.shareInfo.shareConfig.requiredVersion = exactVersion
        }
      } catch (err) {
        console.error('[ModuleFederationPlugin] beforeLoadShare error: ', err)
      }
      return args
    },

    errorLoadShare(args: any) {
      console.error('[ModuleFederationPlugin] errorLoadShare error: ', args)
      return args
    }
  }

  return plugin as ModuleFederationRuntimePlugin
}

// Splits a comma/whitespace separated list like "@onecx, primeng" into ["@onecx", "primeng"].
function parseAllowedPackageGroups(rawValue: unknown): string[] {
  return (typeof rawValue === 'string' ? rawValue : '')
    .split(/[\s,]+/)
    .map((group) => group.trim())
    .filter(Boolean)
}

/**
 * Loads the `MF_PLUGIN_ALLOWED_PACKAGE_GROUPS` runtime setting from `assets/env.json` once, and
 * caches it on the shared store. Must be awaited before `mfRuntimePlugin()` is registered, since
 * the hooks read the cached value synchronously.
 */
export async function loadAllowedPackageGroupsForMFPlugin(): Promise<void> {
  const store = getStore()
  if (store.allowedPackageGroups) {
    // Already attempted earlier this page load (successfully or not). `assets/env.json` cannot
    // change without a page reload, so skip the extra network request instead of re-fetching.
    console.debug('[MF][VersionResolver] Allowed package groups already loaded; skipping reload.')
    return
  }

  try {
    const response = await fetch(new URL('assets/env.json', document.baseURI))
    if (!response.ok) throw new Error(`Failed to load runtime environment: ${response.status}`)

    const env = (await response.json()) as Record<string, unknown>
    store.allowedPackageGroups = parseAllowedPackageGroups(env['MF_PLUGIN_ALLOWED_PACKAGE_GROUPS'])
  } catch (err) {
    console.warn(
      '[MF][VersionResolver] Could not load allowed package groups from runtime config; no packages will be processed by this plugin until the page is reloaded.',
      err
    )
    store.allowedPackageGroups = []
  }
}

/**
 * True if `pkgName` (or the package behind `args`) was configured via
 * `MF_PLUGIN_ALLOWED_PACKAGE_GROUPS`, either by exact package name or by its section/group
 * (e.g. "@onecx" matches "@onecx/angular-utils"). Packages that don't match are left to Module
 * Federation's normal, unmodified resolution.
 */
export function isPartOfAllowedPackageOrPackageGroupMFPlugin(args: any, originalPkgName?: string): boolean {
  const allowedPackageGroups = getStore().allowedPackageGroups ?? []
  const pkgName =
    originalPkgName ??
    args?.pkgName ??
    args?.options?.name ??
    args?.name ??
    args?.origin?.options?.name ??
    args?.origin?.name ??
    ''
  if (pkgName === '') return false
  const packageGroup = pkgName.split('/')[0]
  return (
    allowedPackageGroups.includes(pkgName) ||
    allowedPackageGroups.some((pkg) => pkgName?.startsWith(pkg)) ||
    allowedPackageGroups.includes(packageGroup) ||
    allowedPackageGroups.some((pkg) => packageGroup?.startsWith(pkg))
  )
}

// Exported for unit testing only; not meant to be used outside this module.
export {
  getStore,
  getSection,
  parseVersion,
  compareVersions,
  pickRequiredVersion,
  resolveBestCandidate,
  hasCaretRequiredVersion,
  findAppShareEntry,
  collectAppSectionData,
  storeAppSectionData,
  parseAllowedPackageGroups
}
export type { Version, SectionAppData, SectionData, ResolvedSection, ShareResolutionStore, CollectedSectionData }
