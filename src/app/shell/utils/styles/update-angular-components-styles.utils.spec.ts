import { dataNoPortalLayoutStylesKey, dataStyleIdKey } from '@onecx/angular-utils'
jest.mock('@onecx/angular-utils', () => {
  const actual = jest.requireActual('@onecx/angular-utils')
  return { ...actual, replacePrimengPrefix: jest.fn() }
})
import { replacePrimengPrefix } from '@onecx/angular-utils'
import { updateAngularComponentsStyles } from './update-angular-components-styles.utils'

function mutation(...nodes: Node[]): MutationRecord {
  return { addedNodes: nodes } as unknown as MutationRecord
}

describe('updateAngularComponentsStyles', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    jest.restoreAllMocks()
    jest.mocked(replacePrimengPrefix).mockReset()
  })

  it('ignores ordinary styles and Angular component styles without text', () => {
    const plain = document.createElement('style')
    plain.textContent = 'body {}'
    const emptyAngularStyle = document.createElement('style')
    emptyAngularStyle.textContent = ''
    const changingContentStyle = document.createElement('style')
    let contentReads = 0
    Object.defineProperty(changingContentStyle, 'textContent', {
      configurable: true,
      get: () => (++contentReads === 1 ? '[_nghost-changing]' : '')
    })
    const nullContentNode = { textContent: null } as unknown as Node

    updateAngularComponentsStyles([mutation(plain, emptyAngularStyle, changingContentStyle, nullContentNode)])

    expect(plain.textContent).toBe('body {}')
    expect(contentReads).toBe(2)
  })

  it('ignores Angular styles with missing owners or missing scope data', () => {
    const missingOwner = document.createElement('style')
    missingOwner.textContent = '[_nghost-missing] {}'
    const missingAttribute = document.createElement('style')
    missingAttribute.textContent = '[_nghost] {}'
    updateAngularComponentsStyles([mutation(missingOwner)])
    updateAngularComponentsStyles([mutation(missingAttribute)])

    const ownerWithoutStyle = document.createElement('div')
    ownerWithoutStyle.setAttribute('_nghost-owner', '')
    document.body.appendChild(ownerWithoutStyle)
    const missingStyleData = document.createElement('style')
    missingStyleData.textContent = '[_nghost-owner] {}'
    updateAngularComponentsStyles([mutation(missingStyleData)])

    expect(missingOwner.textContent).toContain('_nghost-missing')
    expect(missingAttribute.textContent).toContain('[_nghost]')
    expect(missingStyleData.textContent).toContain('_nghost-owner')
  })

  it('finds scope data on a parent and replaces PrimeNG prefixes when layout styles are enabled', () => {
    const app = document.createElement('div')
    app.dataset[dataStyleIdKey] = 'product|app'
    app.dataset[dataNoPortalLayoutStylesKey] = ''
    const owner = document.createElement('div')
    owner.setAttribute('_nghost-owner', '')
    app.appendChild(owner)
    document.body.appendChild(app)
    const style = document.createElement('style')
    const originalCss = '[_nghost-owner] { --p-color: red; }'
    style.textContent = originalCss
    const replace = jest.mocked(replacePrimengPrefix).mockReturnValue('replaced')

    updateAngularComponentsStyles([mutation(style)])

    expect(replace).toHaveBeenCalledWith(originalCss, 'product|app')
    expect(style.textContent).toBe('replaced')
  })

  it('does not replace styles without a no-portal-layout-styles attribute', () => {
    const owner = document.createElement('div')
    owner.setAttribute('_nghost-owner', '')
    owner.dataset[dataStyleIdKey] = 'product|app'
    document.body.appendChild(owner)
    const style = document.createElement('style')
    style.textContent = '[_nghost-owner] { --p-color: red; }'
    const replace = jest.mocked(replacePrimengPrefix)

    updateAngularComponentsStyles([mutation(style)])

    expect(replace).not.toHaveBeenCalled()
    expect(style.textContent).toContain('--p-color')
  })
})
