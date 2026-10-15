import type { ModuleFederationRuntimePlugin } from '@module-federation/enhanced/runtime'

/**
 * Module Federation runtime plugin.
 *
 * Goal: packages belonging to the same "section" (npm scope, e.g. @angular, @onecx,
 * primeng, rxjs, ...) should all resolve to ONE consistent version across every
 * already-loaded app in the same share scope, instead of each app pinning its own
 * version independently.
 *
 * Flow:
 * - beforeInit: for the app currently initializing, group its shared config into
 *   sections and record { requiredVersion, packages } per section on `window`.
 * - beforeLoadShare: for the package being loaded, pick the best already-registered
 *   candidate app for its section and force this app's requiredVersion for that
 *   package to the exact version the candidate provides.
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

interface ShareResolutionStore {
  sections: Record<string, SectionData>
  resolved: Record<string, Record<string, ResolvedSection | null>>
  allowedPackageGroups?: string[]
}

function getStore(): ShareResolutionStore {
  const w = window as any
  w.__mfShareResolution__ ??= { sections: {}, appsSharedConfig: {}, resolved: {} }
  return w.__mfShareResolution__ as ShareResolutionStore
}

// Group packages by npm scope / first path segment: "@angular/core" -> "@angular", "primeng/base" -> "primeng"
function getSection(pkgName: string): string {
  return pkgName.split('/')[0]
}

function parseVersion(v: string): [number, number, number] {
  const core = v.split('+')[0].split('-')[0]
  const parts = core.split('.').map((n) => parseInt(n, 10) || 0)
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
}

// Compare two CONCRETE versions (not ranges). Descending sort helper.
function compareVersions(a: string, b: string): number {
  const [a1, a2, a3] = parseVersion(a)
  const [b1, b2, b3] = parseVersion(b)
  if (a1 !== b1) return a1 - b1
  if (a2 !== b2) return a2 - b2
  return a3 - b3
}

// A section's requiredVersion is normally identical across its packages (lockstep release).
// Pick the most common declared value, tie-broken by the highest version.
function pickRequiredVersion(versions: string[]): string {
  const counts = new Map<string, number>()
  for (const v of versions) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || compareVersions(b[0], a[0]))[0]?.[0] ?? ''
}

/**
 * Find the best version to align this app's section with.
 * 1. Collect the requesting app's tracked packages for this section.
 * 2. Best loaded candidate: highest loading/loaded version of pkgName (same major as requiredVersion)
 *    that is registered for ALL of the requesting app's tracked section packages.
 * 3. If the app's own version is higher than (2), leave resolution to Module Federation.
 * 4. If no compatible package version is already loading or loaded, leave resolution to Module Federation.
 */
function resolveBestCandidate(
  appName: string,
  pkgName: string,
  thisApp: SectionAppData,
  sharedScope: string,
  origin: any,
  ownVersion: string
): ResolvedSection | null | undefined {
  const shareScopeMap = origin?.shareScopeMap ?? {}
  const scopeMap = shareScopeMap[sharedScope] ?? {}

  const sectionPackages = thisApp.packages
  const requiredMajor = /\d+/.exec(thisApp.requiredVersion ?? '')?.[0]

  const loadedCandidates = Object.entries(scopeMap[pkgName] ?? {})
    .filter(([, shared]: [string, any]) => shared?.from && (shared.loaded || shared.loading))
    .map(([version, shared]: [string, any]) => ({ version, from: shared.from as string }))
    .filter((c) => !requiredMajor || String(parseVersion(c.version)[0]) === requiredMajor)
    .sort((a, b) => compareVersions(b.version, a.version))

  if (loadedCandidates.length === 0) return undefined

  let bestCandidate: (ResolvedSection & { version: string }) | undefined
  for (const cand of loadedCandidates) {
    if (sectionPackages.every((p) => !!scopeMap[p]?.[cand.version])) {
      bestCandidate = {
        candidateApp: cand.from,
        version: cand.version,
        versions: Object.fromEntries(sectionPackages.map((p) => [p, cand.version]))
      }
      break
    }
  }

  if (ownVersion && bestCandidate && compareVersions(ownVersion, bestCandidate.version) > 0) {
    console.warn(
      `[MF][VersionResolver] Skipping alignment for "${appName}"/"${pkgName}": own version ${ownVersion} is higher than candidate ${bestCandidate.version}; leaving resolution to Module Federation.`
    )
    return null
  }

  if (bestCandidate) return { candidateApp: bestCandidate.candidateApp, versions: bestCandidate.versions }
  return undefined
}

export default function mfRuntimePlugin(): ModuleFederationRuntimePlugin {
  const plugin: any = {
    name: 'OneCXModuleFederationPlugin',

    beforeInit(args: any) {
      try {
        const appName = args?.userOptions?.name ?? args?.origin?.name

        const shared = args?.shareInfo ?? {}
        const store = getStore()
        const bySection: Record<string, { versions: string[]; packages: string[] }> = {}
        const entryMapSharedByAppBySections: Record<string, Record<string, string>> = {}

        for (const pkgName of Object.keys(shared)) {
          if (!isPartOfAllowedPackageOrPackageGroupMFPlugin(args, pkgName)) continue

          const entries = shared[pkgName]
          const list = Array.isArray(entries) ? entries : [entries]
          const entry = list.find((e: any) => e?.from === appName)
          if (!entry) continue
          const requiredVersion = entry.shareConfig?.requiredVersion
          if (typeof requiredVersion !== 'string' || !requiredVersion.startsWith('^')) {
            console.warn(
              `[ModuleFederationPlugin] Always use a caret (^) for the required version of "${pkgName}" shared by "${appName}". Current required version: "${requiredVersion}"`
            )
            continue
          }

          const section = getSection(pkgName)
          entryMapSharedByAppBySections[section] ??= {}
          entryMapSharedByAppBySections[section][pkgName] = entry.shareConfig?.requiredVersion ?? null

          bySection[section] ??= { versions: [], packages: [] }
          bySection[section].packages.push(pkgName)
          bySection[section].versions.push(requiredVersion)
        }

        for (const [section, data] of Object.entries(bySection)) {
          const requiredVersion = pickRequiredVersion(data.versions)
          store.sections[section] ??= { apps: {} }
          store.sections[section].apps[appName] = {
            requiredVersion: requiredVersion,
            packages: data.packages,
            packageMapping: entryMapSharedByAppBySections[section] ?? {}
          }
        }
      } catch (err) {
        console.error('[ModuleFederationPlugin] beforeInit error: ', err)
      }
      return args
    },

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

        if (!thisApp || typeof requiredVersion !== 'string' || !requiredVersion.startsWith('^')) return args

        store.resolved[appName] ??= {}
        const hasCachedResolution = Object.prototype.hasOwnProperty.call(store.resolved[appName], section)
        let resolution: ResolvedSection | null | undefined = store.resolved[appName][section]
        if (!hasCachedResolution) {
          resolution = resolveBestCandidate(appName, pkgName, thisApp, sharedScope, args.origin, args.shareInfo.version)
          if (resolution === undefined) return args
          store.resolved[appName][section] = resolution
          if (resolution === null) return args
        }

        if (!resolution) return args
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
      if (!isPartOfAllowedPackageOrPackageGroupMFPlugin(args, args.pkgName)) return args
      console.error('[ModuleFederationPlugin] errorLoadShare error: ', args)
      return args
    }
  }

  return plugin as ModuleFederationRuntimePlugin
}

export async function loadAllowedPackageGroupsForMFPlugin(): Promise<void> {
  const store = getStore()
  if (store.allowedPackageGroups) return
  try {
    const response = await fetch(new URL('assets/env.json', document.baseURI))
    if (!response.ok) throw new Error(`Failed to load runtime environment: ${response.status}`)

    const env = (await response.json()) as Record<string, unknown>
    store.allowedPackageGroups = String(env['MF_PLUGIN_ALLOWED_PACKAGE_GROUPS'] ?? '')
      .split(/[\s,]+/)
      .map((group) => group.trim())
      .filter(Boolean)
  } catch (err) {
    console.warn('[MF][VersionResolver] Could not load allowed package groups from runtime config.', err)
    store.allowedPackageGroups = []
  }
}

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
  const packageGroup = pkgName.split('/')[0] ?? ''
  return (
    allowedPackageGroups.some((pkg) => pkgName === pkg) ||
    allowedPackageGroups.some((pkg) => pkgName?.startsWith(pkg)) ||
    allowedPackageGroups.some((pkg) => packageGroup === pkg) ||
    allowedPackageGroups.some((pkg) => packageGroup?.startsWith(pkg))
  )
}

