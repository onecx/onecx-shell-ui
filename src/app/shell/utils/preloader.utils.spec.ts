import * as moduleFederation from '@module-federation/enhanced/runtime'

import {
  allPreloaders,
  loadPreloaderModule,
  angular21Preloader,
  angular22Preloader,
  angular18Preloader,
  angular19Preloader,
  angular20Preloader,
  react19Preloader,
  selectRequiredPreloaders,
  initializeWorkspaceAfterPreloaders
} from './preloader.utils'

jest.mock('@module-federation/enhanced/runtime', () => ({
  registerRemotes: jest.fn(),
  loadRemote: jest.fn().mockResolvedValue('MockModule')
}))

describe('Preloader Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.onecxPreloaders = {}
    jest.mocked(moduleFederation.loadRemote).mockImplementation(async () => {
      window.onecxPreloaders['mock-key'] = true
      return 'MockModule'
    })
  })

  describe('selectRequiredPreloaders', () => {
    it('selects all preloaders sharing the default scope', () => {
      expect(selectRequiredPreloaders([{ shareScope: 'default' }], [])).toEqual([
        angular18Preloader,
        angular19Preloader,
        angular20Preloader
      ])
    })

    it('maps each explicit non-default scope to its preloader', () => {
      expect(
        selectRequiredPreloaders(
          [{ shareScope: 'angular_21' }, { shareScope: 'angular_22' }],
          [{ shareScope: 'react_19' }]
        )
      ).toEqual([angular21Preloader, angular22Preloader, react19Preloader])
    })

    it('deduplicates preloader selections across routes and components', () => {
      expect(
        selectRequiredPreloaders(
          [{ shareScope: 'angular_21' }],
          [{ shareScope: 'angular_21' }, { shareScope: 'angular_22' }]
        )
      ).toEqual([angular21Preloader, angular22Preloader])
    })

    it.each([undefined, 'unknown'])('falls back to all preloaders for scope %s', (shareScope) => {
      expect(selectRequiredPreloaders([{ shareScope }], [])).toEqual(allPreloaders)
    })

    it('selects no preloaders when the workspace has no remotes', () => {
      expect(selectRequiredPreloaders([], [])).toEqual([])
    })
  })

  describe('preloader definitions', () => {
    it('defines the Angular 22 preloader with the angular_22 share scope', () => {
      expect(angular22Preloader).toEqual({
        name: 'angular-22-preloader',
        relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-22-loader/mf-manifest.json',
        windowKey: 'angular-22',
        exposedModule: 'Angular22Loader',
        shareScope: 'angular_22'
      })
    })

    it('keeps the Angular 21 preloader isolated in the angular_21 share scope', () => {
      expect(angular21Preloader.shareScope).toBe('angular_21')
      expect(angular22Preloader.shareScope).toBe('angular_22')
      expect(angular21Preloader.shareScope).not.toBe(angular22Preloader.shareScope)
    })
  })

  describe('loadPreloaderModule', () => {
    it('should load a remote module using module federation with document base href', async () => {
      const dom = document
      jest.spyOn(dom, 'getElementsByTagName').mockReturnValue([{ href: 'http://localhost/base/' }] as any)
      const mockPreloader = {
        name: 'mock-preloader',
        relativeRemoteEntryUrl: 'mock/remoteEntry.js',
        windowKey: 'mock-key',
        exposedModule: 'MockModule',
        shareScope: 'default'
      }

      await loadPreloaderModule(mockPreloader)

      expect(moduleFederation.registerRemotes).toHaveBeenCalledWith([
        {
          type: 'module',
          entry: `/base/${mockPreloader.relativeRemoteEntryUrl}`,
          name: mockPreloader.name,
          shareScope: mockPreloader.shareScope
        }
      ])
      expect(moduleFederation.loadRemote).toHaveBeenCalledWith(`${mockPreloader.name}/${mockPreloader.exposedModule}`)
    })

    it('should load a remote module using module federation with location origin', async () => {
      const dom = document
      jest.spyOn(dom, 'getElementsByTagName').mockReturnValue([undefined as any] as any)
      location.href = 'http://localhost/baseOrigin/admin'
      const mockPreloader = {
        name: 'mock-preloader',
        relativeRemoteEntryUrl: 'mock/remoteEntry.js',
        windowKey: 'mock-key',
        exposedModule: 'MockModule',
        shareScope: 'default'
      }

      await loadPreloaderModule(mockPreloader)

      expect(moduleFederation.registerRemotes).toHaveBeenCalledWith([
        {
          type: 'module',
          entry: `/${mockPreloader.relativeRemoteEntryUrl}`,
          name: mockPreloader.name,
          shareScope: mockPreloader.shareScope
        }
      ])
      expect(moduleFederation.loadRemote).toHaveBeenCalledWith(`${mockPreloader.name}/${mockPreloader.exposedModule}`)
    })

    it('rejects when a preloader remote fails instead of marking it as loaded', async () => {
      const failure = new Error('preloader unavailable')
      const warning = jest.spyOn(console, 'warn').mockImplementation()
      const error = jest.spyOn(console, 'error').mockImplementation()
      window.onecxPreloaders = {}
      jest.mocked(moduleFederation.loadRemote).mockRejectedValue(failure)

      await expect(
        loadPreloaderModule({
          name: 'mock-preloader',
          relativeRemoteEntryUrl: 'mock/remoteEntry.js',
          windowKey: 'mock-key',
          exposedModule: 'MockModule',
          shareScope: 'default'
        })
      ).rejects.toBe(failure)

      expect(window.onecxPreloaders['mock-key']).toBeUndefined()
      expect(warning).toHaveBeenCalledWith(
        'Could not load preloader: mock-key. Application might not work as expected.'
      )
      expect(error).toHaveBeenCalledWith(failure)
      warning.mockRestore()
      error.mockRestore()
    })

    it('shares an in-flight load and waits for remote loading to finish', async () => {
      let resolveRemote!: (value: string) => void
      const remoteLoad = new Promise<string>((resolve) => {
        resolveRemote = resolve
      })
      jest.mocked(moduleFederation.loadRemote).mockReturnValue(remoteLoad)
      const mockPreloader = {
        name: 'mock-preloader',
        relativeRemoteEntryUrl: 'mock/remoteEntry.js',
        windowKey: 'mock-key',
        exposedModule: 'MockModule',
        shareScope: 'default'
      }

      const firstLoad = loadPreloaderModule(mockPreloader)
      const secondLoad = loadPreloaderModule(mockPreloader)
      expect(secondLoad).toBe(firstLoad)
      let resolved = false
      void firstLoad.then(() => (resolved = true))

      await Promise.resolve()
      expect(resolved).toBe(false)
      window.onecxPreloaders['mock-key'] = true
      resolveRemote('MockModule')
      await Promise.all([firstLoad, secondLoad])
      expect(resolved).toBe(true)
    })

    it('rejects if a resolved preloader remote did not signal readiness', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation()
      jest.mocked(moduleFederation.loadRemote).mockResolvedValue('MockModule')

      await expect(
        loadPreloaderModule({
          name: 'mock-preloader',
          relativeRemoteEntryUrl: 'mock/remoteEntry.js',
          windowKey: 'not-ready-key',
          exposedModule: 'MockModule',
          shareScope: 'default'
        })
      ).rejects.toThrow('Preloader did not report readiness: not-ready-key')
      expect(window.onecxPreloaders['not-ready-key']).toBeUndefined()
      error.mockRestore()
    })

    it('does not initialize the workspace until its required preloader finishes loading', async () => {
      let resolveRemote!: (value: string) => void
      const remoteLoad = new Promise<string>((resolve) => {
        resolveRemote = resolve
      })
      jest.mocked(moduleFederation.loadRemote).mockReturnValue(remoteLoad)
      const initializeWorkspace = jest.fn().mockResolvedValue(undefined)
      const initialization = initializeWorkspaceAfterPreloaders(
        [{ shareScope: 'angular_21' }],
        [{ shareScope: 'angular_21' }],
        initializeWorkspace
      )

      await Promise.resolve()
      expect(initializeWorkspace).not.toHaveBeenCalled()
      window.onecxPreloaders['angular-21'] = true
      resolveRemote('MockModule')
      await initialization
      expect(initializeWorkspace).toHaveBeenCalledTimes(1)
    })
  })
})
