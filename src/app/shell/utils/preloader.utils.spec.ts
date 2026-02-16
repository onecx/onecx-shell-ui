import { loadPreloaderModule, ensurePreloaderModuleLoaded } from './preloader.utils'
import * as moduleFederation from '@module-federation/enhanced/runtime'

jest.mock('@module-federation/enhanced/runtime', () => ({
  registerRemotes: jest.fn(),
  loadRemote: jest.fn().mockResolvedValue('MockModule')
}))

describe('Preloader Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
      expect(moduleFederation.loadRemote).toHaveBeenCalledWith(
        `${mockPreloader.name}/${mockPreloader.exposedModule}`
      )
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
      expect(moduleFederation.loadRemote).toHaveBeenCalledWith(
        `${mockPreloader.name}/${mockPreloader.exposedModule}`
      )
    })
  })

  describe('ensurePreloaderModuleLoaded', () => {
    it('should resolve immediately if the preloader module is already loaded', async () => {
      window.onecxPreloaders = { 'mock-key': true }

      const mockPreloader = {
        name: 'mock-preloader',
        relativeRemoteEntryUrl: 'mock/remoteEntry.js',
        windowKey: 'mock-key',
        exposedModule: 'MockModule',
        shareScope: 'default'
      }

      const result = await ensurePreloaderModuleLoaded(mockPreloader)
      expect(result).toBe(true)
    })

    it('should wait until the preloader module is loaded', async () => {
      window.onecxPreloaders = {}

      const mockPreloader = {
        name: 'mock-preloader',
        relativeRemoteEntryUrl: 'mock/remoteEntry.js',
        windowKey: 'mock-key',
        exposedModule: 'MockModule',
        shareScope: 'default'
      }

      setTimeout(() => {
        window.onecxPreloaders['mock-key'] = true
      }, 100)

      const result = await ensurePreloaderModuleLoaded(mockPreloader)
      expect(result).toBe(true)
    })
  })
})
