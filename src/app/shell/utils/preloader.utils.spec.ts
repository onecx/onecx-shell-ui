import { loadPreloaderModule, ensurePreloaderModuleLoaded } from './preloader.utils'
import * as moduleFederation from '@module-federation/enhanced/runtime'

jest.mock('@module-federation/enhanced/runtime', () => ({
  registerRemotes: jest.fn(),
  loadRemote: jest.fn().mockResolvedValue('MockModule')
}))

describe('Preloader Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(moduleFederation.loadRemote).mockResolvedValue('MockModule')
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

    it('marks a preloader as failed when its remote module rejects', async () => {
      const failure = new Error('preloader unavailable')
      const warning = jest.spyOn(console, 'warn').mockImplementation()
      const error = jest.spyOn(console, 'error').mockImplementation()
      window.onecxPreloaders = {}
      jest.mocked(moduleFederation.loadRemote).mockRejectedValue(failure)

      await loadPreloaderModule({
        name: 'mock-preloader',
        relativeRemoteEntryUrl: 'mock/remoteEntry.js',
        windowKey: 'mock-key',
        exposedModule: 'MockModule',
        shareScope: 'default'
      })

      expect(window.onecxPreloaders['mock-key']).toBe(true)
      expect(warning).toHaveBeenCalledWith(
        'Could not load preloader: mock-key. Application might not work as expected.'
      )
      expect(error).toHaveBeenCalledWith(failure)
      warning.mockRestore()
      error.mockRestore()
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
