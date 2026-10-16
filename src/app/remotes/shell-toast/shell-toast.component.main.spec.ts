jest.mock('./shell-toast.component.bootstrap', () => {
  throw new Error('remote bootstrap failed')
})

describe('shell toast main entry point', () => {
  it('logs a rejected remote bootstrap import', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation()
    jest.isolateModules(() => {
      require('./shell-toast.component.main')
    })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(error).toHaveBeenCalledWith(new Error('remote bootstrap failed'))
    error.mockRestore()
  })
})
