export {}

const mockLoadPreloaderModule = jest.fn()
const mockEnsurePreloaderModuleLoaded = jest.fn()

jest.mock('./app/shell/utils/preloader.utils', () => {
  const actual = jest.requireActual('./app/shell/utils/preloader.utils')
  return {
    ...actual,
    loadPreloaderModule: mockLoadPreloaderModule,
    ensurePreloaderModuleLoaded: mockEnsurePreloaderModuleLoaded
  }
})

jest.mock('./bootstrap', () => ({}))

describe('main entry point', () => {
  beforeEach(() => {
    jest.resetModules()
    mockLoadPreloaderModule.mockReset().mockResolvedValue(undefined)
    mockEnsurePreloaderModuleLoaded.mockReset().mockResolvedValue(true)
    Object.assign(globalThis, { __FEDERATION__: { __INSTANCES__: [{ name: 'shell' }] } })
    Object.assign(window, { onecxPreloaders: {} })
  })

  it('exposes the federation instance and loads every preloader before bootstrap', async () => {
    jest.isolateModules(() => {
      require('./main')
    })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect((globalThis as typeof globalThis & { onecxFederationInstance: unknown }).onecxFederationInstance).toEqual({
      name: 'shell'
    })
    expect(mockLoadPreloaderModule).toHaveBeenCalledTimes(5)
    expect(mockEnsurePreloaderModuleLoaded).toHaveBeenCalledTimes(5)
  })
})
