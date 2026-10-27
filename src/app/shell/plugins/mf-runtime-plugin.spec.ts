import mfRuntimePlugin, {
  collectAppSectionData,
  compareVersions,
  findAppShareEntry,
  getSection,
  getStore,
  hasCaretRequiredVersion,
  isPartOfAllowedPackageOrPackageGroupMFPlugin,
  loadAllowedPackageGroupsForMFPlugin,
  parseAllowedPackageGroups,
  parseVersion,
  pickRequiredVersion,
  resolveBestCandidate,
  storeAppSectionData
} from './mf-runtime-plugin'

function resetStore(allowedPackageGroups?: string[]): void {
  (window as any).__mfShareResolution__ = undefined
  if (allowedPackageGroups) {
    getStore().allowedPackageGroups = allowedPackageGroups
  }
}

describe('mf-runtime-plugin', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('getSection', () => {
    it('groups scoped packages by their npm scope', () => {
      expect(getSection('@onecx/angular-utils')).toBe('@onecx')
    })

    it('groups unscoped packages by their first path segment', () => {
      expect(getSection('primeng/button')).toBe('primeng')
    })

    it('returns the whole name when there is no path segment', () => {
      expect(getSection('rxjs')).toBe('rxjs')
    })
  })

  describe('parseVersion', () => {
    it('parses a plain semantic version', () => {
      expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 })
    })

    it('ignores pre-release suffixes', () => {
      expect(parseVersion('1.2.3-beta.1')).toEqual({ major: 1, minor: 2, patch: 3 })
    })

    it('ignores build metadata', () => {
      expect(parseVersion('1.2.3+build.5')).toEqual({ major: 1, minor: 2, patch: 3 })
    })

    it('ignores both pre-release and build metadata', () => {
      expect(parseVersion('1.2.3-rc.1+build.5')).toEqual({ major: 1, minor: 2, patch: 3 })
    })

    it('defaults missing or non-numeric parts to 0', () => {
      expect(parseVersion('1')).toEqual({ major: 1, minor: 0, patch: 0 })
      expect(parseVersion('1.x')).toEqual({ major: 1, minor: 0, patch: 0 })
    })

    it('ignores a leading range prefix such as a caret', () => {
      expect(parseVersion('^1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 })
    })
  })

  describe('compareVersions', () => {
    it('returns 0 for equal versions', () => {
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
    })

    it('orders by major first', () => {
      expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0)
    })

    it('orders by minor when major is equal', () => {
      expect(compareVersions('1.3.0', '1.2.9')).toBeGreaterThan(0)
    })

    it('orders by patch when major and minor are equal', () => {
      expect(compareVersions('1.2.4', '1.2.3')).toBeGreaterThan(0)
      expect(compareVersions('1.2.3', '1.2.4')).toBeLessThan(0)
    })
  })

  describe('pickRequiredVersion', () => {
    it('returns an empty string for no versions', () => {
      expect(pickRequiredVersion([])).toBe('')
    })

    it('returns the only version when all entries match', () => {
      expect(pickRequiredVersion(['^1.2.3', '^1.2.3', '^1.2.3'])).toBe('^1.2.3')
    })

    it('picks the most frequently declared version', () => {
      expect(pickRequiredVersion(['^1.0.0', '^2.0.0', '^2.0.0'])).toBe('^2.0.0')
    })

    it('keeps the current leader when a later version is neither more common nor higher', () => {
      expect(pickRequiredVersion(['^3.0.0', '^1.0.0', '^2.0.0'])).toBe('^3.0.0')
    })

    it('breaks ties by picking the highest version', () => {
      expect(pickRequiredVersion(['^1.0.0', '^2.0.0'])).toBe('^2.0.0')
    })
  })

  describe('hasCaretRequiredVersion', () => {
    it('is true for caret ranges', () => {
      expect(hasCaretRequiredVersion('^1.2.3')).toBe(true)
    })

    it('is false for exact versions, other ranges, or non-strings', () => {
      expect(hasCaretRequiredVersion('1.2.3')).toBe(false)
      expect(hasCaretRequiredVersion('~1.2.3')).toBe(false)
      expect(hasCaretRequiredVersion(undefined)).toBe(false)
      expect(hasCaretRequiredVersion(null)).toBe(false)
    })
  })

  describe('findAppShareEntry', () => {
    it('finds the matching entry in an array of candidates', () => {
      const entries = [{ from: 'app1' }, { from: 'app2' }]
      expect(findAppShareEntry(entries, 'app2')).toBe(entries[1])
    })

    it('treats a single object as a one-element list', () => {
      const entry = { from: 'app1' }
      expect(findAppShareEntry(entry, 'app1')).toBe(entry)
    })

    it('returns undefined when no entry matches', () => {
      expect(findAppShareEntry([{ from: 'app1' }], 'app2')).toBeUndefined()
    })
  })

  describe('parseAllowedPackageGroups', () => {
    it('splits on commas and whitespace', () => {
      expect(parseAllowedPackageGroups('@onecx, primeng   rxjs')).toEqual(['@onecx', 'primeng', 'rxjs'])
    })

    it('returns an empty array for empty or non-string input', () => {
      expect(parseAllowedPackageGroups('')).toEqual([])
      expect(parseAllowedPackageGroups(undefined)).toEqual([])
      expect(parseAllowedPackageGroups(null)).toEqual([])
    })
  })

  describe('isPartOfAllowedPackageOrPackageGroupMFPlugin', () => {
    it('matches by exact package name', () => {
      resetStore(['rxjs'])
      expect(isPartOfAllowedPackageOrPackageGroupMFPlugin({}, 'rxjs')).toBe(true)
    })

    it('matches by group / npm scope', () => {
      resetStore(['@onecx'])
      expect(isPartOfAllowedPackageOrPackageGroupMFPlugin({}, '@onecx/angular-utils')).toBe(true)
    })

    it('does not match packages outside the allowlist', () => {
      resetStore(['@onecx'])
      expect(isPartOfAllowedPackageOrPackageGroupMFPlugin({}, '@angular/core')).toBe(false)
    })

    it('returns false when the allowlist has not been loaded yet', () => {
      resetStore()
      expect(isPartOfAllowedPackageOrPackageGroupMFPlugin({}, '@onecx/foo')).toBe(false)
    })

    it('resolves the package name from args when originalPkgName is omitted', () => {
      resetStore(['@onecx'])
      expect(isPartOfAllowedPackageOrPackageGroupMFPlugin({ pkgName: '@onecx/foo' })).toBe(true)
    })

    it('returns false when no package name can be resolved', () => {
      resetStore(['@onecx'])
      expect(isPartOfAllowedPackageOrPackageGroupMFPlugin({})).toBe(false)
    })
  })

  describe('resolveBestCandidate', () => {
    const thisApp = { requiredVersion: '^1.0.0', packages: ['@onecx/foo', '@onecx/bar'] }

    it('returns undefined when there are no loading/loaded candidates', () => {
      const origin = { shareScopeMap: { default: {} } }
      expect(resolveBestCandidate('app2', '@onecx/foo', thisApp, 'default', origin, '1.0.0')).toBeUndefined()
    })

    it('falls back to an empty share scope state when origin has no shareScopeMap', () => {
      expect(resolveBestCandidate('app2', '@onecx/foo', thisApp, 'default', {}, '1.0.0')).toBeUndefined()
    })

    it('falls back to an empty share scope state when the share scope is unknown', () => {
      const origin = { shareScopeMap: { default: {} } }
      expect(resolveBestCandidate('app2', '@onecx/foo', thisApp, 'unknown-scope', origin, '1.0.0')).toBeUndefined()
    })

    it('returns the highest candidate version registered for every required package', () => {
      const origin = {
        shareScopeMap: {
          default: {
            '@onecx/foo': {
              '1.1.0': { from: 'app1', loaded: true },
              '1.2.0': { from: 'app1', loaded: true }
            },
            '@onecx/bar': {
              '1.2.0': { from: 'app1', loaded: true }
            }
          }
        }
      }
      const result = resolveBestCandidate('app2', '@onecx/foo', thisApp, 'default', origin, '1.0.0')
      expect(result).toEqual({
        candidateApp: 'app1',
        versions: { '@onecx/foo': '1.2.0', '@onecx/bar': '1.2.0' }
      })
    })

    it('skips a candidate version that is not registered for every required package', () => {
      const origin = {
        shareScopeMap: {
          default: {
            // 1.2.0 only available for foo, not bar -> must fall back to 1.1.0
            '@onecx/foo': {
              '1.1.0': { from: 'app1', loaded: true },
              '1.2.0': { from: 'app1', loaded: true }
            },
            '@onecx/bar': {
              '1.1.0': { from: 'app1', loaded: true }
            }
          }
        }
      }
      const result = resolveBestCandidate('app2', '@onecx/foo', thisApp, 'default', origin, '1.0.0')
      expect(result).toEqual({
        candidateApp: 'app1',
        versions: { '@onecx/foo': '1.1.0', '@onecx/bar': '1.1.0' }
      })
    })

    it('considers packages with a resolved lib even without loaded/loading flags', () => {
      const origin = {
        shareScopeMap: {
          default: {
            '@onecx/foo': { '1.2.0': { from: 'app1', lib: () => undefined } },
            '@onecx/bar': { '1.2.0': { from: 'app1', lib: () => undefined } }
          }
        }
      }
      const result = resolveBestCandidate('app2', '@onecx/foo', thisApp, 'default', origin, '1.0.0')
      expect(result?.candidateApp).toBe('app1')
    })

    it('considers packages that are still loading (not yet loaded)', () => {
      const origin = {
        shareScopeMap: {
          default: {
            '@onecx/foo': { '1.2.0': { from: 'app1', loading: Promise.resolve() } },
            '@onecx/bar': { '1.2.0': { from: 'app1', loading: Promise.resolve() } }
          }
        }
      }
      const result = resolveBestCandidate('app2', '@onecx/foo', thisApp, 'default', origin, '1.0.0')
      expect(result?.candidateApp).toBe('app1')
    })

    it('ignores registrations without a providing app (from)', () => {
      const origin = {
        shareScopeMap: {
          default: {
            '@onecx/foo': { '1.2.0': { loaded: true } },
            '@onecx/bar': { '1.2.0': { loaded: true } }
          }
        }
      }
      expect(resolveBestCandidate('app2', '@onecx/foo', thisApp, 'default', origin, '1.0.0')).toBeUndefined()
    })

    it('accepts any major version when the section has no required major recorded', () => {
      const noMajorApp = { requiredVersion: undefined, packages: ['@onecx/foo', '@onecx/bar'] } as any
      const origin = {
        shareScopeMap: {
          default: {
            '@onecx/foo': { '2.0.0': { from: 'app1', loaded: true } },
            '@onecx/bar': { '2.0.0': { from: 'app1', loaded: true } }
          }
        }
      }
      const result = resolveBestCandidate('app2', '@onecx/foo', noMajorApp, 'default', origin, '1.0.0')
      expect(result?.candidateApp).toBe('app1')
    })

    it('returns the candidate without warning when the app provides no version of its own', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
      const origin = {
        shareScopeMap: {
          default: {
            '@onecx/foo': { '1.2.0': { from: 'app1', loaded: true } },
            '@onecx/bar': { '1.2.0': { from: 'app1', loaded: true } }
          }
        }
      }
      const result = resolveBestCandidate('app2', '@onecx/foo', thisApp, 'default', origin, '')
      expect(result).toEqual({ candidateApp: 'app1', versions: { '@onecx/foo': '1.2.0', '@onecx/bar': '1.2.0' } })
      expect(warnSpy).not.toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('returns undefined when no candidate version covers every required package', () => {
      const origin = {
        shareScopeMap: {
          default: {
            '@onecx/foo': { '1.1.0': { from: 'app1', loaded: true } },
            '@onecx/bar': {}
          }
        }
      }
      expect(resolveBestCandidate('app2', '@onecx/foo', thisApp, 'default', origin, '1.0.0')).toBeUndefined()
    })

    it('ignores candidates from a different major version', () => {
      const origin = {
        shareScopeMap: {
          default: {
            '@onecx/foo': { '2.0.0': { from: 'app1', loaded: true } },
            '@onecx/bar': { '2.0.0': { from: 'app1', loaded: true } }
          }
        }
      }
      expect(resolveBestCandidate('app2', '@onecx/foo', thisApp, 'default', origin, '1.0.0')).toBeUndefined()
    })

    it('returns undefined and warns when the app already provides a higher version than the candidate', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
      const origin = {
        shareScopeMap: {
          default: {
            '@onecx/foo': { '1.1.0': { from: 'app1', loaded: true } },
            '@onecx/bar': { '1.1.0': { from: 'app1', loaded: true } }
          }
        }
      }
      const result = resolveBestCandidate('app2', '@onecx/foo', thisApp, 'default', origin, '1.5.0')
      expect(result).toBeUndefined()
      expect(warnSpy).toHaveBeenCalledTimes(1)
      warnSpy.mockRestore()
    })
  })

  describe('collectAppSectionData / storeAppSectionData', () => {
    it('returns an empty object when the app has no shareInfo at all', () => {
      resetStore(['@onecx'])
      expect(collectAppSectionData({}, 'app1')).toEqual({})
    })

    it('groups allowed, caret-ranged packages by section and ignores the rest', () => {
      resetStore(['@onecx'])
      const args = {
        shareInfo: {
          '@onecx/foo': { from: 'app1', shareConfig: { requiredVersion: '^1.2.3' } },
          '@onecx/bar': { from: 'app1', shareConfig: { requiredVersion: '^1.2.3' } },
          '@angular/core': { from: 'app1', shareConfig: { requiredVersion: '^15.0.0' } }
        }
      }

      const sectionData = collectAppSectionData(args, 'app1')
      expect(Object.keys(sectionData)).toEqual(['@onecx'])
      expect(sectionData['@onecx'].packages).toEqual(['@onecx/foo', '@onecx/bar'])

      const store = getStore()
      storeAppSectionData(store, 'app1', sectionData)
      expect(store.sections['@onecx'].apps['app1']).toEqual({
        requiredVersion: '^1.2.3',
        packages: ['@onecx/foo', '@onecx/bar'],
        packageMapping: { '@onecx/foo': '^1.2.3', '@onecx/bar': '^1.2.3' }
      })
    })

    it('warns and skips packages without a caret requiredVersion', () => {
      resetStore(['@onecx'])
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
      const args = {
        shareInfo: {
          '@onecx/foo': { from: 'app1', shareConfig: { requiredVersion: '1.2.3' } }
        }
      }

      const sectionData = collectAppSectionData(args, 'app1')
      expect(sectionData).toEqual({})
      expect(warnSpy).toHaveBeenCalledTimes(1)
      warnSpy.mockRestore()
    })

    it('ignores packages belonging to another app', () => {
      resetStore(['@onecx'])
      const args = {
        shareInfo: {
          '@onecx/foo': [{ from: 'other-app', shareConfig: { requiredVersion: '^1.2.3' } }]
        }
      }
      expect(collectAppSectionData(args, 'app1')).toEqual({})
    })
  })

  describe('mfRuntimePlugin', () => {
    it('exposes the expected plugin name and hooks', () => {
      const plugin = mfRuntimePlugin() as any
      expect(plugin.name).toBe('OneCXModuleFederationPlugin')
      expect(typeof plugin.beforeInit).toBe('function')
      expect(typeof plugin.beforeLoadShare).toBe('function')
      expect(typeof plugin.errorLoadShare).toBe('function')
    })

    describe('beforeInit', () => {
      it('logs and recovers from unexpected errors', () => {
        resetStore(['@onecx'])
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        const plugin = mfRuntimePlugin() as any
        const args: any = { userOptions: { name: 'app1' } }
        Object.defineProperty(args, 'shareInfo', {
          get() {
            throw new Error('boom')
          }
        })

        expect(() => plugin.beforeInit(args)).not.toThrow()
        expect(errorSpy).toHaveBeenCalledWith('[ModuleFederationPlugin] beforeInit error: ', expect.any(Error))
        errorSpy.mockRestore()
      })

      it('records allowed, caret-ranged packages for the initializing app', () => {
        resetStore(['@onecx'])
        const plugin = mfRuntimePlugin() as any
        const args = {
          userOptions: { name: 'app1' },
          shareInfo: {
            '@onecx/foo': { from: 'app1', shareConfig: { requiredVersion: '^1.2.3' } },
            'not-allowed': { from: 'app1', shareConfig: { requiredVersion: '^1.0.0' } }
          }
        }

        plugin.beforeInit(args)

        const store = getStore()
        expect(store.sections['@onecx'].apps['app1'].packages).toEqual(['@onecx/foo'])
        expect(store.sections['not-allowed']).toBeUndefined()
      })

      it('resolves the app name from origin.name when userOptions.name is absent', () => {
        resetStore(['@onecx'])
        const plugin = mfRuntimePlugin() as any
        const args = {
          origin: { name: 'app1' },
          shareInfo: {
            '@onecx/foo': { from: 'app1', shareConfig: { requiredVersion: '^1.2.3' } }
          }
        }

        plugin.beforeInit(args)

        expect(getStore().sections['@onecx'].apps['app1'].packages).toEqual(['@onecx/foo'])
      })
    })

    describe('beforeLoadShare', () => {
      function seedSection(appName: string, section: string, data: { requiredVersion: string; packages: string[] }) {
        const store = getStore()
        store.sections[section] ??= { apps: {} }
        store.sections[section].apps[appName] = { requiredVersion: data.requiredVersion, packages: data.packages }
      }

      it('aligns the requiredVersion to the best already-loaded candidate', () => {
        resetStore(['@onecx'])
        seedSection('app2', '@onecx', { requiredVersion: '^1.0.0', packages: ['@onecx/foo', '@onecx/bar'] })

        const plugin = mfRuntimePlugin() as any
        const args = {
          pkgName: '@onecx/foo',
          origin: {
            name: 'app2',
            options: { name: 'app2' },
            shareScopeMap: {
              default: {
                '@onecx/foo': { '1.2.0': { from: 'app1', loaded: true } },
                '@onecx/bar': { '1.2.0': { from: 'app1', loaded: true } }
              }
            }
          },
          shareInfo: { scope: ['default'], shareConfig: { requiredVersion: '^1.0.0' }, version: '1.0.0' }
        }

        plugin.beforeLoadShare(args)

        expect(args.shareInfo.shareConfig.requiredVersion).toBe('1.2.0')
        expect(getStore().resolved['app2']['@onecx']).toEqual({
          candidateApp: 'app1',
          versions: { '@onecx/foo': '1.2.0', '@onecx/bar': '1.2.0' }
        })
      })

      it('does not rewrite requiredVersion when no exact version is cached for this package', () => {
        resetStore(['@onecx'])
        seedSection('app2', '@onecx', { requiredVersion: '^1.0.0', packages: ['@onecx/foo', '@onecx/bar'] })
        getStore().resolved['app2'] = { '@onecx': { candidateApp: 'app1', versions: { '@onecx/bar': '1.2.0' } } }

        const plugin = mfRuntimePlugin() as any
        const args = {
          pkgName: '@onecx/foo',
          origin: { name: 'app2', options: { name: 'app2' }, shareScopeMap: {} },
          shareInfo: { scope: ['default'], shareConfig: { requiredVersion: '^1.0.0' }, version: '1.0.0' }
        }

        plugin.beforeLoadShare(args)

        expect(args.shareInfo.shareConfig.requiredVersion).toBe('^1.0.0')
      })

      it('caches the resolution per app/section and reuses it for later packages', () => {
        resetStore(['@onecx'])
        seedSection('app2', '@onecx', { requiredVersion: '^1.0.0', packages: ['@onecx/foo', '@onecx/bar'] })

        const shareScopeMap: Record<string, Record<string, Record<string, any>>> = {
          default: {
            '@onecx/foo': { '1.2.0': { from: 'app1', loaded: true } },
            '@onecx/bar': { '1.2.0': { from: 'app1', loaded: true } }
          }
        }
        const origin = { name: 'app2', options: { name: 'app2' }, shareScopeMap }
        const plugin = mfRuntimePlugin() as any

        const firstArgs = {
          pkgName: '@onecx/foo',
          origin,
          shareInfo: { scope: ['default'], shareConfig: { requiredVersion: '^1.0.0' }, version: '1.0.0' }
        }
        plugin.beforeLoadShare(firstArgs)
        expect(firstArgs.shareInfo.shareConfig.requiredVersion).toBe('1.2.0')

        // Simulate a newer version becoming available after the first resolution was cached.
        shareScopeMap['default']['@onecx/foo']['1.3.0'] = { from: 'app3', loaded: true }
        shareScopeMap['default']['@onecx/bar']['1.3.0'] = { from: 'app3', loaded: true }

        const secondArgs = {
          pkgName: '@onecx/bar',
          origin,
          shareInfo: { scope: ['default'], shareConfig: { requiredVersion: '^1.0.0' }, version: '1.0.0' }
        }
        plugin.beforeLoadShare(secondArgs)
        // Still aligned to the cached 1.2.0 candidate, not the newer 1.3.0.
        expect(secondArgs.shareInfo.shareConfig.requiredVersion).toBe('1.2.0')
      })

      it('logs and recovers from unexpected errors', () => {
        resetStore(['@onecx'])
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        const plugin = mfRuntimePlugin() as any
        const args: any = { pkgName: '@onecx/foo', origin: { name: 'app2', options: { name: 'app2' } } }
        Object.defineProperty(args, 'shareInfo', {
          get() {
            throw new Error('boom')
          }
        })

        expect(() => plugin.beforeLoadShare(args)).not.toThrow()
        expect(errorSpy).toHaveBeenCalledWith('[ModuleFederationPlugin] beforeLoadShare error: ', expect.any(Error))
        errorSpy.mockRestore()
      })

      it('leaves args untouched for packages outside the allowlist', () => {
        resetStore(['@onecx'])
        const plugin = mfRuntimePlugin() as any
        const args = {
          pkgName: '@angular/core',
          origin: { name: 'app2', options: { name: 'app2' }, shareScopeMap: {} },
          shareInfo: { scope: ['default'], shareConfig: { requiredVersion: '^15.0.0' }, version: '15.0.0' }
        }
        plugin.beforeLoadShare(args)
        expect(args.shareInfo.shareConfig.requiredVersion).toBe('^15.0.0')
      })

      it('resolves the app name from origin.name when origin.options.name is absent', () => {
        resetStore(['@onecx'])
        seedSection('app2', '@onecx', { requiredVersion: '^1.0.0', packages: ['@onecx/foo', '@onecx/bar'] })

        const plugin = mfRuntimePlugin() as any
        const args = {
          pkgName: '@onecx/foo',
          origin: {
            name: 'app2',
            shareScopeMap: {
              default: {
                '@onecx/foo': { '1.2.0': { from: 'app1', loaded: true } },
                '@onecx/bar': { '1.2.0': { from: 'app1', loaded: true } }
              }
            }
          },
          shareInfo: { scope: ['default'], shareConfig: { requiredVersion: '^1.0.0' }, version: '1.0.0' }
        }

        plugin.beforeLoadShare(args)

        expect(args.shareInfo.shareConfig.requiredVersion).toBe('1.2.0')
      })

      it('falls back to an empty share scope when shareInfo.scope is missing', () => {
        resetStore(['@onecx'])
        seedSection('app2', '@onecx', { requiredVersion: '^1.0.0', packages: ['@onecx/foo', '@onecx/bar'] })

        const plugin = mfRuntimePlugin() as any
        const args: any = {
          pkgName: '@onecx/foo',
          origin: { name: 'app2', options: { name: 'app2' }, shareScopeMap: {} },
          shareInfo: { scope: [], shareConfig: { requiredVersion: '^1.0.0' }, version: '1.0.0' }
        }

        expect(() => plugin.beforeLoadShare(args)).not.toThrow()
        expect(args.shareInfo.shareConfig.requiredVersion).toBe('^1.0.0')
      })

      it('leaves args untouched when this app has no tracked data for the section', () => {
        resetStore(['@onecx'])
        const plugin = mfRuntimePlugin() as any
        const args = {
          pkgName: '@onecx/foo',
          origin: { name: 'app2', options: { name: 'app2' }, shareScopeMap: {} },
          shareInfo: { scope: ['default'], shareConfig: { requiredVersion: '^1.0.0' }, version: '1.0.0' }
        }

        plugin.beforeLoadShare(args)

        expect(args.shareInfo.shareConfig.requiredVersion).toBe('^1.0.0')
      })

      it('leaves args untouched (without caching) when no candidate is loading or loaded yet', () => {
        resetStore(['@onecx'])
        seedSection('app2', '@onecx', { requiredVersion: '^1.0.0', packages: ['@onecx/foo', '@onecx/bar'] })

        const plugin = mfRuntimePlugin() as any
        const args = {
          pkgName: '@onecx/foo',
          origin: { name: 'app2', options: { name: 'app2' }, shareScopeMap: { default: {} } },
          shareInfo: { scope: ['default'], shareConfig: { requiredVersion: '^1.0.0' }, version: '1.0.0' }
        }

        plugin.beforeLoadShare(args)

        expect(args.shareInfo.shareConfig.requiredVersion).toBe('^1.0.0')
        expect(getStore().resolved['app2']).toEqual({})
      })

      it('does not cache a skip decision, so a later package in the same app/section retries and warns again', () => {
        resetStore(['@onecx'])
        seedSection('app2', '@onecx', { requiredVersion: '^1.0.0', packages: ['@onecx/foo', '@onecx/bar'] })
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)

        const origin = {
          name: 'app2',
          options: { name: 'app2' },
          shareScopeMap: {
            default: {
              '@onecx/foo': { '1.1.0': { from: 'app1', loaded: true } },
              '@onecx/bar': { '1.1.0': { from: 'app1', loaded: true } }
            }
          }
        }
        const plugin = mfRuntimePlugin() as any

        const firstArgs = {
          pkgName: '@onecx/foo',
          origin,
          shareInfo: { scope: ['default'], shareConfig: { requiredVersion: '^1.0.0' }, version: '1.5.0' }
        }
        plugin.beforeLoadShare(firstArgs)
        expect(firstArgs.shareInfo.shareConfig.requiredVersion).toBe('^1.0.0')
        expect(getStore().resolved['app2']).toEqual({})

        const secondArgs = {
          pkgName: '@onecx/bar',
          origin,
          shareInfo: { scope: ['default'], shareConfig: { requiredVersion: '^1.0.0' }, version: '1.5.0' }
        }
        plugin.beforeLoadShare(secondArgs)
        expect(secondArgs.shareInfo.shareConfig.requiredVersion).toBe('^1.0.0')
        expect(warnSpy).toHaveBeenCalledTimes(2)
        warnSpy.mockRestore()
      })
    })

    describe('errorLoadShare', () => {
      it('logs every package load failure, even outside the allowlist', () => {
        resetStore(['@onecx'])
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        const plugin = mfRuntimePlugin() as any
        const args = { pkgName: '@angular/core' }

        plugin.errorLoadShare(args)

        expect(errorSpy).toHaveBeenCalledWith('[ModuleFederationPlugin] errorLoadShare error: ', args)
        errorSpy.mockRestore()
      })
    })
  })

  describe('loadAllowedPackageGroupsForMFPlugin', () => {
    const originalFetch = global.fetch

    afterEach(() => {
      global.fetch = originalFetch
    })

    it('loads and parses the allowlist from assets/env.json', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ MF_PLUGIN_ALLOWED_PACKAGE_GROUPS: '@onecx, primeng' })
      }) as any

      await loadAllowedPackageGroupsForMFPlugin()

      expect(getStore().allowedPackageGroups).toEqual(['@onecx', 'primeng'])
    })

    it('falls back to an empty list and warns when the response is not ok', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any

      await loadAllowedPackageGroupsForMFPlugin()

      expect(getStore().allowedPackageGroups).toEqual([])
      expect(warnSpy).toHaveBeenCalledTimes(1)
      warnSpy.mockRestore()
    })

    it('falls back to an empty list and warns when the fetch rejects', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
      global.fetch = jest.fn().mockRejectedValue(new Error('network error')) as any

      await loadAllowedPackageGroupsForMFPlugin()

      expect(getStore().allowedPackageGroups).toEqual([])
      expect(warnSpy).toHaveBeenCalledTimes(1)
      warnSpy.mockRestore()
    })

    it('does not re-fetch once a result has been cached', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ MF_PLUGIN_ALLOWED_PACKAGE_GROUPS: '@onecx' })
      })
      global.fetch = fetchMock as any

      await loadAllowedPackageGroupsForMFPlugin()
      await loadAllowedPackageGroupsForMFPlugin()

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })
})
