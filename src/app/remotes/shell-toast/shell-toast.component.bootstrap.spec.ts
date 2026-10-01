jest.mock('@onecx/angular-webcomponents', () => ({
  bootstrapRemoteComponent: jest.fn()
}))

import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import './shell-toast.component.bootstrap'

describe('shell toast bootstrap entry point', () => {
  it('registers the shell toast remote with its providers', () => {
    expect(bootstrapRemoteComponent).toHaveBeenCalledWith(
      expect.any(Function),
      'ocx-shell-toast-component',
      false,
      expect.any(Array)
    )
  })
})
