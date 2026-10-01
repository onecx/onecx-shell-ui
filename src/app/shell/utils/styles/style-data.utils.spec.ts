import {
  dataIntermediateMfeElementKey,
  dataIntermediateNoPortalLayoutStylesKey,
  dataIntermediateStyleIdKey,
  dataMfeElementKey,
  dataNoPortalLayoutStylesKey,
  dataStyleIdKey,
  dataStyleIsolationKey
} from '@onecx/angular-utils'

import {
  appendIntermediateStyleData,
  appendStyleData,
  createWrapper,
  dataWrapperElementKey,
  findStyleDataWrapper,
  markElement,
  observeStyleDataWrapper,
  removeStyleDataRecursive,
  wrapWithDiv
} from './style-data.utils'

describe('style data utilities', () => {
  it('marks elements and reuses existing marker collections', () => {
    const element: { onecx?: { markers?: string[] } } = {}
    markElement(element, 'first')
    markElement(element, 'second')

    expect(element.onecx?.markers).toEqual(['first', 'second'])
  })

  it('creates wrappers with optional style data', () => {
    const emptyWrapper = createWrapper()
    const dataWrapper = createWrapper({ styleId: 'app', noPortalLayoutStyles: '', mfeElement: '' })

    expect(emptyWrapper.dataset[dataWrapperElementKey]).toBe('')
    expect(emptyWrapper.dataset[dataStyleIsolationKey]).toBeUndefined()
    expect(dataWrapper.dataset[dataStyleIdKey]).toBe('app')
    expect(dataWrapper.dataset[dataNoPortalLayoutStylesKey]).toBe('')
    expect(dataWrapper.dataset[dataMfeElementKey]).toBe('')
  })

  it('wraps elements and finds the nearest style wrapper', () => {
    const element = document.createElement('button')
    const wrapper = wrapWithDiv(element, { styleId: 'app', noPortalLayoutStyles: undefined, mfeElement: undefined })
    const nested = document.createElement('span')
    element.appendChild(nested)

    expect(wrapper.firstElementChild).toBe(element)
    expect(findStyleDataWrapper(nested)).toBe(wrapper)
    expect(findStyleDataWrapper(document.createElement('div'))).toBeNull()
  })

  it('appends normal and intermediate style attributes for populated and empty values', () => {
    const full = document.createElement('div')
    const empty = document.createElement('div')
    appendStyleData(full, { styleId: 'app', noPortalLayoutStyles: 'false', mfeElement: 'remote' })
    appendStyleData(empty, { styleId: '', noPortalLayoutStyles: undefined, mfeElement: undefined })

    expect(full.dataset).toMatchObject({
      [dataStyleIsolationKey]: '',
      [dataStyleIdKey]: 'app',
      [dataNoPortalLayoutStylesKey]: 'false',
      [dataMfeElementKey]: 'remote'
    })
    expect(empty.dataset[dataStyleIsolationKey]).toBe('')
    expect(empty.dataset[dataStyleIdKey]).toBeUndefined()
    expect(empty.dataset[dataNoPortalLayoutStylesKey]).toBeUndefined()
    expect(empty.dataset[dataMfeElementKey]).toBeUndefined()

    const intermediate = document.createElement('div')
    appendIntermediateStyleData(intermediate, { styleId: 'app', noPortalLayoutStyles: '', mfeElement: '' })
    expect(intermediate.dataset).toMatchObject({
      [dataIntermediateStyleIdKey]: 'app',
      [dataIntermediateNoPortalLayoutStylesKey]: '',
      [dataIntermediateMfeElementKey]: ''
    })

    const emptyIntermediate = document.createElement('div')
    appendIntermediateStyleData(emptyIntermediate, {
      styleId: '',
      noPortalLayoutStyles: undefined,
      mfeElement: undefined
    })
    expect(emptyIntermediate.dataset[dataIntermediateStyleIdKey]).toBe('')
    expect(emptyIntermediate.dataset[dataIntermediateNoPortalLayoutStylesKey]).toBeUndefined()
    expect(emptyIntermediate.dataset[dataIntermediateMfeElementKey]).toBeUndefined()
  })

  it('removes style data recursively and removes an empty observed wrapper', async () => {
    const wrapper = createWrapper({ styleId: 'app', noPortalLayoutStyles: '', mfeElement: '' })
    document.body.appendChild(wrapper)
    const child = document.createElement('span')
    appendIntermediateStyleData(child, { styleId: 'app', noPortalLayoutStyles: '', mfeElement: '' })
    child.dataset[dataStyleIsolationKey] = ''
    child.dataset[dataStyleIdKey] = 'app'
    child.dataset[dataNoPortalLayoutStylesKey] = ''
    child.dataset[dataMfeElementKey] = ''
    wrapper.append(child, document.createTextNode('text'))

    removeStyleDataRecursive(wrapper)
    expect(child.dataset[dataStyleIsolationKey]).toBeUndefined()
    expect(child.dataset[dataIntermediateStyleIdKey]).toBeUndefined()

    observeStyleDataWrapper(wrapper)
    wrapper.removeChild(child)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(wrapper.isConnected).toBe(true)
    wrapper.removeChild(wrapper.firstChild!)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(wrapper.isConnected).toBe(false)
  })

  it('skips data cleanup when given an element without a dataset', () => {
    const element = { dataset: undefined, children: [] } as unknown as HTMLElement

    expect(() => removeStyleDataRecursive(element)).not.toThrow()
  })
})
