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

jest.mock('./bootstrap', () => {
  throw new Error('bootstrap import failed')
})

describe('main bootstrap failure', () => {
  it('logs an error when the bootstrap entry point cannot be imported', async () => {
    jest.resetModules()
    mockLoadPreloaderModule.mockResolvedValue(undefined)
    mockEnsurePreloaderModuleLoaded.mockResolvedValue(true)
    Object.assign(globalThis, { __FEDERATION__: { __INSTANCES__: [{}] } })
    Object.assign(window, { onecxPreloaders: {} })
    const error = jest.spyOn(console, 'error').mockImplementation()

    jest.isolateModules(() => {
      require('./main')
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(error).toHaveBeenCalledWith(new Error('bootstrap import failed'))
    error.mockRestore()
  })
})
