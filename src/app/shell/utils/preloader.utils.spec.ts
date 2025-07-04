import { loadPreloaderModule, ensurePreloaderModuleLoaded, getLocation } from './preloader.utils'
import * as moduleFederation from '@angular-architects/module-federation'

jest.mock('@angular-architects/module-federation', () => ({
  loadRemoteModule: jest.fn().mockResolvedValue('MockModule')
}))

describe('Preloader Utils', () => {
  describe('loadPreloaderModule', () => {
    it('should load a remote module using module federation with correct data', async () => {
      const mockPreloader = {
        relativeRemoteEntryUrl: 'mock/remoteEntry.js',
        windowKey: 'mock-key',
        exposedModule: './MockModule'
      }

      const result = await loadPreloaderModule(mockPreloader)

      expect(moduleFederation.loadRemoteModule).toHaveBeenCalledWith({
        type: 'module',
        remoteEntry: `${getLocation().deploymentPath}${mockPreloader.relativeRemoteEntryUrl}`,
        exposedModule: mockPreloader.exposedModule
      })
      expect(result).toBe('MockModule')
    })
  })

  describe('ensurePreloaderModuleLoaded', () => {
    it('should resolve immediately if the preloader module is already loaded', async () => {
      window.onecxPreloaders = { 'mock-key': true }

      const mockPreloader = {
        relativeRemoteEntryUrl: 'mock/remoteEntry.js',
        windowKey: 'mock-key',
        exposedModule: './MockModule'
      }

      const result = await ensurePreloaderModuleLoaded(mockPreloader)
      expect(result).toBe(true)
    })

    it('should wait until the preloader module is loaded', async () => {
      window.onecxPreloaders = {}

      const mockPreloader = {
        relativeRemoteEntryUrl: 'mock/remoteEntry.js',
        windowKey: 'mock-key',
        exposedModule: './MockModule'
      }

      setTimeout(() => {
        window.onecxPreloaders['mock-key'] = true
      }, 100)

      const result = await ensurePreloaderModuleLoaded(mockPreloader)
      expect(result).toBe(true)
    })
  })
})
