import { Injectable } from '@angular/core'
import { findOnexThemeVariables, hasValueInDom } from '@onecx/angular-utils/theme'
import { FALLBACK_ORDER_DEFAULT, resolveLeafFallback } from '@onecx/integration-interface'
import type { RelaxedAxisKind } from '@onecx/integration-interface'

/**
 * Fills in on-demand CSS fallbacks for theme variables.
 *
 * Scans every `<style>` node added to `document.head` (and the styles already present when the
 * observer starts) for `var(--onecx-theme-*)` references. For each referenced variable that has no
 * value in the DOM, it writes one-step relaxation links `--name: var(--less-specific)` into a single
 * `:root` stylesheet (a `style` element tagged `data-onecx-theme-gap-fill`) appended at the end of the
 * head, below the theme and MFE styles in the cascade. Each link relaxes the variable by one axis per
 * the theme's fallback order, and the chain stops at the first step that already has a value, so the
 * links only fill gaps and never override a defined value.
 */
@Injectable({ providedIn: 'root' })
export class ThemeFallbackGapFillService {
  private static readonly SHEET_DATASET_KEY = 'onecxThemeGapFill'

  private observer: MutationObserver | null = null
  private gapFillSheet: HTMLStyleElement | null = null
  private fallbackOrder: RelaxedAxisKind[] | null = null
  private readonly pending = new Set<string>()
  private sheetBuffer = ''

  startObserver(): void {
    if (this.observer) {
      return
    }
    this.observer = new MutationObserver((mutationList: MutationRecord[]) => this.processAddedNodes(mutationList))
    this.observer.observe(document.head, { childList: true })
    this.sweepExistingStyles()
  }

  /** Sets the relaxation order used to derive fallbacks, defaulting to the library order when none is given. */
  setFallbackOrder(order: RelaxedAxisKind[] | null = null): void {
    this.fallbackOrder = order ?? FALLBACK_ORDER_DEFAULT
    this.flushPending()
  }

  private expandVariable(varName: string, order: RelaxedAxisKind[]): FallbackStep[] {
    const steps: FallbackStep[] = []
    const seen = new Set<string>([varName])
    let current = varName
    let target = resolveLeafFallback(current, order)
    while (target !== undefined && !seen.has(target)) {
      steps.push({ name: current, target })
      seen.add(target)
      current = target
      target = resolveLeafFallback(current, order)
    }
    return steps
  }

  private isDefined(varName: string): boolean {
    return hasValueInDom(varName)
  }

  private processAddedNodes(mutationList: MutationRecord[]): void {
    this.deferScan(mutationList.flatMap((mutation) => Array.from(mutation.addedNodes)))
  }

  private sweepExistingStyles(): void {
    this.deferScan(
      Array.from(document.head.querySelectorAll('style')).filter((element) => !this.isGapFillSheet(element))
    )
  }

  // Deferred to a macrotask so the scan reads a node's final content: the scope polyfill may replace a
  // style node (remove + re-insert) within the same mutation batch, and only the surviving node is both
  // connected and fully written once the deferral runs.
  private deferScan(nodes: Node[]): void {
    setTimeout(() => nodes.filter((node) => this.isScannableStyle(node)).forEach((node) => this.scanNode(node)), 0)
  }

  private isScannableStyle(node: Node): node is Element {
    return (
      node.nodeType === Node.ELEMENT_NODE &&
      node.isConnected &&
      (node as Element).textContent !== '' &&
      !this.isGapFillSheet(node)
    )
  }

  private isGapFillSheet(node: Node): boolean {
    return node instanceof HTMLElement && node.dataset[ThemeFallbackGapFillService.SHEET_DATASET_KEY] !== undefined
  }

  private ensureGapFillSheet(): HTMLStyleElement {
    if (this.gapFillSheet?.isConnected) {
      return this.gapFillSheet
    }
    const sheet = document.createElement('style')
    sheet.dataset[ThemeFallbackGapFillService.SHEET_DATASET_KEY] = ''
    document.head.appendChild(sheet)
    this.gapFillSheet = sheet
    return sheet
  }

  private scanNode(node: Node): void {
    const text = typeof node.textContent === 'string' ? node.textContent : ''
    if (!text) {
      return
    }
    // Collect every referenced variable regardless of presence; the defined-check is applied per variable.
    for (const name of findOnexThemeVariables(text, () => true)) {
      this.registerReference(name)
    }
  }

  private registerReference(name: string): void {
    if (this.isDefined(name)) {
      return
    }
    if (!this.fallbackOrder) {
      this.pending.add(name)
      return
    }
    this.build(name)
  }

  private build(name: string): void {
    const steps: FallbackStep[] = []
    for (const step of this.expandVariable(name, this.fallbackOrder!)) {
      if (this.isDefined(step.name)) {
        break
      }
      steps.push(step)
    }
    this.append(steps)
  }

  private flushPending(): void {
    const toBuild = [...this.pending].filter((name) => !this.isDefined(name))
    this.pending.clear()
    for (const name of toBuild) {
      this.build(name)
    }
  }

  private append(steps: FallbackStep[]): void {
    if (steps.length === 0) {
      return
    }
    const sheet = this.ensureGapFillSheet()
    const lines = steps.map(({ name, target }) => `  ${name}: var(${target});`)
    this.sheetBuffer += `${lines.join('\n')}\n`
    sheet.textContent = `:root {\n${this.sheetBuffer}}`
  }

  // Releases the observer, sheet, and buffered state so a single root instance can be reused across tests.
  reset(): void {
    this.observer?.disconnect()
    this.observer = null
    this.gapFillSheet?.remove()
    this.gapFillSheet = null
    this.pending.clear()
    this.sheetBuffer = ''
    this.fallbackOrder = null
  }
}

interface FallbackStep {
  name: string
  target: string
}
