import { expectNoA11yViolations, formatViolations } from './axe-helper'

describe('axe-helper', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('passes for an accessible element', async () => {
    const element = document.createElement('div')
    element.innerHTML = '<button type="button">Save</button>'
    document.body.appendChild(element)

    await expectNoA11yViolations(element)
  })

  it('fails with the rule id and the offending node', async () => {
    const element = document.createElement('div')
    element.innerHTML = '<img src="x.png">'
    document.body.appendChild(element)

    await expect(expectNoA11yViolations(element)).rejects.toThrow(/image-alt/)
  })

  it('formats violations with their nodes', () => {
    const report = formatViolations([
      { id: 'image-alt', impact: 'critical', help: 'Images must have alternate text', nodes: [{ html: '<img>' }] }
    ] as never)

    expect(report).toBe('image-alt (critical): Images must have alternate text\n  <img>')
  })
})
