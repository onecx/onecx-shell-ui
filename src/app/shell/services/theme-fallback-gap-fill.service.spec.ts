import { ThemeFallbackGapFillService } from './theme-fallback-gap-fill.service'
import type { RelaxedAxisKind } from '@onecx/integration-interface'

describe(ThemeFallbackGapFillService.name, () => {
  // The service is a singleton in the app (providedIn: 'root'); the tests mirror that with one shared
  // instance so observers from a previous test never keep watching the shared document.head.
  const service = new ThemeFallbackGapFillService()

  // Relaxation axis orders: the default (state -> variant -> severity) and one that relaxes severity first.
  const SEVERITY_FIRST_ORDER: RelaxedAxisKind[] = ['severity', 'variant', 'state']
  const DEFAULT_ORDER: RelaxedAxisKind[] = ['state', 'variant', 'severity']
  const GAP_FILL_SELECTOR = 'style[data-onecx-theme-gap-fill]'

  // Counts how many times the (spied) MutationObserver callback fires, so each test pins down exactly how
  // often the service's head observer is delivered to. The service constructs its own observer, so the
  // constructor is wrapped rather than the callback.
  let moDeliveries = 0
  let moSpy: jest.SpyInstance

  function addHeadStyle(css: string): HTMLStyleElement {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return style
  }

  function sheetText(): string | null {
    return document.head.querySelector(GAP_FILL_SELECTOR)?.textContent ?? null
  }

  // The deferred scan is a zero-timeout timer scheduled from the mutation-observer callback, so it fires
  // after the test's own continuation; yield a few real milliseconds so assertions read the post-scan
  // state (and the service's own sheet addition has been filtered out of the observer).
  function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 5))
  }

  // reset() disconnects the previous test's observer, so no observer survives into the next test.
  beforeEach(() => {
    service.reset()
    document.head.innerHTML = ''
    document.documentElement.removeAttribute('style')
    const OriginalMO = window.MutationObserver
    moDeliveries = 0
    moSpy = jest.spyOn(window, 'MutationObserver').mockImplementation(function (
      this: unknown,
      callback: MutationCallback
    ) {
      return new OriginalMO((records, observer) => {
        moDeliveries++
        return callback(records, observer)
      })
    })
  })

  afterEach(() => {
    moSpy.mockRestore()
  })

  it('is provided in root', () => {
    expect(service).toBeDefined()
    expect(moDeliveries).toBe(0)
  })

  describe('styles present when the observer starts', () => {
    it('builds the fallback chain for an undefined variable', async () => {
      // A fully-qualified leaf and the intermediate steps of its default-order relaxation chain. The
      // names the libraries emit already carry the `--` prefix, so a declaration uses them as-is.
      const LEAF = '--onecx-theme-primitives-variant-primary-state-hover-severity-success-bg-color'
      const L1 = '--onecx-theme-primitives-variant-primary-defaultState-severity-success-bg-color'
      const L2 = '--onecx-theme-primitives-defaultVariant-defaultState-severity-success-bg-color'
      const L3 = '--onecx-theme-primitives-defaultVariant-defaultState-defaultSeverity-bg-color'
      const FULL_CHAIN = `:root {\n  ${LEAF}: var(${L1});\n  ${L1}: var(${L2});\n  ${L2}: var(${L3});\n}`
      const style = addHeadStyle(`.c { color: var(${LEAF}); }`)
      service.startObserver()
      service.setFallbackOrder(DEFAULT_ORDER)
      await settle()

      expect(sheetText()).toBe(FULL_CHAIN)
      expect(document.head.querySelectorAll(GAP_FILL_SELECTOR)).toHaveLength(1)
      expect(style.isConnected).toBe(true)
      // Sweeping styles present at startup adds nothing; only the emitted gap-fill sheet reaches the observer.
      expect(moDeliveries).toBe(1)
    })

    it('skips a variable that is already defined on the root', async () => {
      const LEAF = '--onecx-theme-primitives-variant-primary-state-hover-severity-success-bg-color'
      document.documentElement.style.setProperty(LEAF, 'ok')
      const style = addHeadStyle(`.c { color: var(${LEAF}); }`)
      service.startObserver()
      service.setFallbackOrder(DEFAULT_ORDER)
      await settle()

      expect(sheetText()).toBeNull()
      expect(style.isConnected).toBe(true)
      // Nothing is built and no sheet is created, so the observer is never delivered.
      expect(moDeliveries).toBe(0)
    })
  })

  describe('styles added after the observer starts', () => {
    it('builds the fallback chain for a newly added style', async () => {
      const LEAF = '--onecx-theme-primitives-variant-primary-state-hover-severity-success-bg-color'
      const L1 = '--onecx-theme-primitives-variant-primary-defaultState-severity-success-bg-color'
      const L2 = '--onecx-theme-primitives-defaultVariant-defaultState-severity-success-bg-color'
      const L3 = '--onecx-theme-primitives-defaultVariant-defaultState-defaultSeverity-bg-color'
      const FULL_CHAIN = `:root {\n  ${LEAF}: var(${L1});\n  ${L1}: var(${L2});\n  ${L2}: var(${L3});\n}`
      service.startObserver()
      service.setFallbackOrder(DEFAULT_ORDER)
      const style = addHeadStyle(`.c { color: var(${LEAF}); }`)
      await settle()

      expect(sheetText()).toBe(FULL_CHAIN)
      expect(document.head.querySelectorAll(GAP_FILL_SELECTOR)).toHaveLength(1)
      expect(style.isConnected).toBe(true)
      // One delivery for the added style, one for the gap-fill sheet the service appends.
      expect(moDeliveries).toBe(2)
    })

    it('honours the configured fallback order', async () => {
      const LEAF = '--onecx-theme-primitives-variant-primary-state-hover-severity-success-bg-color'
      // Severity-first relaxation reaches the same fully-relaxed base as the default order, by a different route.
      const L3 = '--onecx-theme-primitives-defaultVariant-defaultState-defaultSeverity-bg-color'
      const SEV_L1 = '--onecx-theme-primitives-variant-primary-state-hover-defaultSeverity-bg-color'
      const SEV_L2 = '--onecx-theme-primitives-defaultVariant-state-hover-defaultSeverity-bg-color'
      const SEVERITY_FIRST_CHAIN = `:root {\n  ${LEAF}: var(${SEV_L1});\n  ${SEV_L1}: var(${SEV_L2});\n  ${SEV_L2}: var(${L3});\n}`
      service.startObserver()
      service.setFallbackOrder(SEVERITY_FIRST_ORDER)
      addHeadStyle(`.c { color: var(${LEAF}); }`)
      await settle()

      expect(sheetText()).toBe(SEVERITY_FIRST_CHAIN)
      expect(moDeliveries).toBe(2)
    })

    it('does not scan its own gap-fill sheet', async () => {
      const LEAF = '--onecx-theme-primitives-variant-primary-state-hover-severity-success-bg-color'
      const L1 = '--onecx-theme-primitives-variant-primary-defaultState-severity-success-bg-color'
      const L2 = '--onecx-theme-primitives-defaultVariant-defaultState-severity-success-bg-color'
      const L3 = '--onecx-theme-primitives-defaultVariant-defaultState-defaultSeverity-bg-color'
      const FULL_CHAIN = `:root {\n  ${LEAF}: var(${L1});\n  ${L1}: var(${L2});\n  ${L2}: var(${L3});\n}`
      service.startObserver()
      service.setFallbackOrder(DEFAULT_ORDER)
      const style = addHeadStyle(`.c { color: var(${LEAF}); }`)
      await settle()

      expect(sheetText()).toBe(FULL_CHAIN)
      expect(document.head.querySelectorAll(GAP_FILL_SELECTOR)).toHaveLength(1)
      // No self-referential declaration: the chain appears exactly once.
      expect(sheetText()?.split(LEAF)).toHaveLength(2)
      expect(style.isConnected).toBe(true)
      // The service's own sheet delivery is recognised as its own sheet and filtered out of the scan.
      expect(moDeliveries).toBe(2)
    })

    it('does not duplicate steps a previous scan already emitted', async () => {
      const LEAF = '--onecx-theme-primitives-variant-primary-state-hover-severity-success-bg-color'
      const L1 = '--onecx-theme-primitives-variant-primary-defaultState-severity-success-bg-color'
      const L2 = '--onecx-theme-primitives-defaultVariant-defaultState-severity-success-bg-color'
      const L3 = '--onecx-theme-primitives-defaultVariant-defaultState-defaultSeverity-bg-color'
      const FULL_CHAIN = `:root {\n  ${LEAF}: var(${L1});\n  ${L1}: var(${L2});\n  ${L2}: var(${L3});\n}`
      service.startObserver()
      service.setFallbackOrder(DEFAULT_ORDER)
      const first = addHeadStyle(`.a { color: var(${LEAF}); }`)
      await settle()

      expect(sheetText()).toBe(FULL_CHAIN)
      const second = addHeadStyle(`.b { background: var(${L1}); }`)
      await settle()

      expect(second.isConnected).toBe(true)
      expect(first.isConnected).toBe(true)
      expect(sheetText()).toBe(FULL_CHAIN)
      // Two deliveries for the first style + its sheet, one more for the second (already-defined) style.
      expect(moDeliveries).toBe(3)
    })
  })

  describe('styles replaced by another observer after being added', () => {
    it('scans the surviving replacement node, not the removed original', async () => {
      const LEAF = '--onecx-theme-primitives-variant-primary-state-hover-severity-success-bg-color'
      const L1 = '--onecx-theme-primitives-variant-primary-defaultState-severity-success-bg-color'
      const L2 = '--onecx-theme-primitives-defaultVariant-defaultState-severity-success-bg-color'
      const L3 = '--onecx-theme-primitives-defaultVariant-defaultState-defaultSeverity-bg-color'
      const FULL_CHAIN = `:root {\n  ${LEAF}: var(${L1});\n  ${L1}: var(${L2});\n  ${L2}: var(${L3});\n}`
      // A second undefined leaf whose relaxation chain differs from LEAF's: if the removed original were
      // scanned, its links would leak into the sheet and the FULL_CHAIN equality below would fail.
      const REMOVED_LEAF = '--onecx-theme-primitives-variant-primary-state-hover-defaultSeverity-bg-color'
      service.startObserver()
      service.setFallbackOrder(DEFAULT_ORDER)
      // The scope polyfill rewrites the style node in place: the original (referencing REMOVED_LEAF) is added,
      // then removed, and a replacement (referencing LEAF) is inserted in its place — all before the deferred
      // scan, so the original is already disconnected when the scan reads the DOM.
      const originalNode = addHeadStyle(`.orig { color: var(${REMOVED_LEAF}); }`)
      originalNode.remove()
      const replacementNode = addHeadStyle(`.c { color: var(${LEAF}); }`)
      await settle()

      // Only the surviving replacement is scanned: the chain is built from LEAF and the removed original's
      // distinct REMOVED_LEAF chain is absent from the sheet.
      expect(sheetText()).toBe(FULL_CHAIN)
      expect(sheetText()).not.toContain(REMOVED_LEAF)
      expect(document.head.querySelectorAll(GAP_FILL_SELECTOR)).toHaveLength(1)
      expect(originalNode.isConnected).toBe(false)
      expect(replacementNode.isConnected).toBe(true)
      // One delivery for the coalesced add/remove/re-add batch, one for the gap-fill sheet the service appends.
      expect(moDeliveries).toBe(2)
    })
  })

  describe('with other mutation observers mutating stylesheets while we observe', () => {
    it('validates only the surviving stylesheet and builds each variable exactly once', async () => {
      const LEAF_A = '--onecx-theme-primitives-variant-primary-state-hover-severity-success-bg-color'
      const L1 = '--onecx-theme-primitives-variant-primary-defaultState-severity-success-bg-color'
      const L2 = '--onecx-theme-primitives-defaultVariant-defaultState-severity-success-bg-color'
      const L3 = '--onecx-theme-primitives-defaultVariant-defaultState-defaultSeverity-bg-color'
      // A second variable another observer appends to the stylesheet mid-flight; its relaxation chain.
      const LEAF_B = '--onecx-theme-primitives-variant-primary-state-hover-defaultSeverity-bg-color'
      const B1 = '--onecx-theme-primitives-variant-primary-defaultState-defaultSeverity-bg-color'
      const EXPECTED = `:root {\n  ${LEAF_A}: var(${L1});\n  ${L1}: var(${L2});\n  ${L2}: var(${L3});\n  ${LEAF_B}: var(${B1});\n  ${B1}: var(${L3});\n}`
      const MARK = 'recreated'

      // Count how many stylesheet contents the service actually validated for variables (i.e. scanned), as
      // opposed to how many times the raw MutationObserver fired.
      let validatedSheets = 0
      const originalScan = (service as any).scanNode.bind(service)
      ;(service as any).scanNode = (node: Node) => {
        validatedSheets++
        return originalScan(node)
      }

      // Both sibling observers key off the MARK attribute (mirroring how the real observers key off markers the
      // gap-fill sheet does not carry), so they never touch the service's own sheet.
      const siblingRecreate = new MutationObserver((list: MutationRecord[]) => {
        for (const mutation of list)
          for (const node of Array.from(mutation.addedNodes)) {
            if (node.nodeName !== 'STYLE') {
              continue
            }
            const element = node as HTMLStyleElement
            if (element.dataset[MARK] === undefined || element.dataset['s1'] !== undefined) {
              continue
            }
            const copy = document.createElement('style')
            copy.textContent = element.textContent
            element.replaceWith(copy)
            copy.dataset[MARK] = ''
            copy.dataset['s1'] = ''
          }
      })
      siblingRecreate.observe(document.head, { childList: true })
      const siblingAppendVar = new MutationObserver((list: MutationRecord[]) => {
        for (const mutation of list)
          for (const node of Array.from(mutation.addedNodes)) {
            if (node.nodeName !== 'STYLE') {
              continue
            }
            const element = node as HTMLStyleElement
            if (element.dataset[MARK] === undefined || element.dataset['s2'] !== undefined) {
              continue
            }
            element.textContent = `${element.textContent}\n.b { color: var(${LEAF_B}); }`
            element.dataset['s2'] = ''
          }
      })
      siblingAppendVar.observe(document.head, { childList: true })

      // The siblings are registered before ours, matching app.module.ts where the style listener initialiser
      // runs ahead of the gap-fill observer.
      service.startObserver()
      service.setFallbackOrder(DEFAULT_ORDER)
      const mfeStyle = document.createElement('style')
      mfeStyle.textContent = `.a { color: var(${LEAF_A}); }`
      mfeStyle.dataset[MARK] = ''
      document.head.appendChild(mfeStyle)
      await settle()
      const finalNode = Array.from(document.head.querySelectorAll('style')).find((n) => n.dataset[MARK] !== undefined)

      try {
        // Exactly one stylesheet was validated for variables: the surviving final node (recreated, with the new
        // variable appended). The removed original and the service's own sheet are not counted.
        expect(validatedSheets).toBe(1)
        // The sheet is built from the final content: it contains LEAF_A's full chain and LEAF_B's chain, and
        // each link appears exactly once (re-scanning across many observer deliveries never double-builds).
        const links = (sheetText() ?? '').split('\n').filter((line) => line.includes(': var('))
        expect(sheetText()).toBe(EXPECTED)
        expect(links).toHaveLength(new Set(links).size)
        expect(finalNode?.isConnected).toBe(true)
        expect(finalNode?.textContent).toContain(LEAF_B)
        // The raw observer fired several times (sibling re-creates + content edits + our sheet append); the
        // meaningful work above stayed bounded to one validated sheet and a duplicate-free set of links.
        expect(moDeliveries).toBeGreaterThan(1)
      } finally {
        delete (service as any).scanNode
        // Release the sibling observers so they do not keep watching the shared head into later tests.
        siblingRecreate.disconnect()
        siblingAppendVar.disconnect()
      }
    })
  })

  describe('before the fallback order is known', () => {
    it('buffers referenced variables without creating a sheet', async () => {
      const LEAF = '--onecx-theme-primitives-variant-primary-state-hover-severity-success-bg-color'
      const style = addHeadStyle(`.c { color: var(${LEAF}); }`)
      service.startObserver()
      await settle()

      expect(style.isConnected).toBe(true)
      // Nothing is built (and no sheet created) while the order is unknown.
      expect(sheetText()).toBeNull()
      expect(moDeliveries).toBe(0)
    })

    it('builds the buffered variables against the order when it is set', async () => {
      const LEAF = '--onecx-theme-primitives-variant-primary-state-hover-severity-success-bg-color'
      const L1 = '--onecx-theme-primitives-variant-primary-defaultState-severity-success-bg-color'
      const L2 = '--onecx-theme-primitives-defaultVariant-defaultState-severity-success-bg-color'
      const L3 = '--onecx-theme-primitives-defaultVariant-defaultState-defaultSeverity-bg-color'
      const FULL_CHAIN = `:root {\n  ${LEAF}: var(${L1});\n  ${L1}: var(${L2});\n  ${L2}: var(${L3});\n}`
      service.startObserver()
      await settle()

      expect(sheetText()).toBeNull()
      service.setFallbackOrder(DEFAULT_ORDER)
      expect(sheetText()).toBe(FULL_CHAIN)
      // The buffered variable is held (no delivery) until the order is set, which appends the sheet; settle so
      // that sheet-append delivery is counted.
      await settle()
      expect(moDeliveries).toBe(1)
    })

    it('skips a variable the theme defines by the time the order is set', async () => {
      const LEAF = '--onecx-theme-primitives-variant-primary-state-hover-severity-success-bg-color'
      service.startObserver()
      await settle()

      expect(sheetText()).toBeNull()
      // The theme supplies the value before arming the order: it is no longer a gap.
      document.documentElement.style.setProperty(LEAF, 'ok')
      service.setFallbackOrder(DEFAULT_ORDER)
      expect(sheetText()).toBeNull()
      expect(moDeliveries).toBe(0)
    })

    it('uses the default order when the theme provides none', async () => {
      const LEAF = '--onecx-theme-primitives-variant-primary-state-hover-severity-success-bg-color'
      const L1 = '--onecx-theme-primitives-variant-primary-defaultState-severity-success-bg-color'
      const L2 = '--onecx-theme-primitives-defaultVariant-defaultState-severity-success-bg-color'
      const L3 = '--onecx-theme-primitives-defaultVariant-defaultState-defaultSeverity-bg-color'
      const FULL_CHAIN = `:root {\n  ${LEAF}: var(${L1});\n  ${L1}: var(${L2});\n  ${L2}: var(${L3});\n}`
      service.startObserver()
      await settle()

      expect(sheetText()).toBeNull()
      // A v1-only theme sends no order, so the default is applied.
      service.setFallbackOrder()
      expect(sheetText()).toBe(FULL_CHAIN)
      // Settle so the sheet-append delivery triggered by the order set is counted.
      await settle()
      expect(moDeliveries).toBe(1)
    })
  })
})
