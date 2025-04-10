export interface CssStyleSheetWithSupportsRule {
  sheet: CSSStyleSheet
  ownerNode: HTMLElement
  supportsRule: CSSSupportsRule
}

export type SelectorPresenceMap = Map<string, boolean>
export type ScopeSelectorPresenceMap = Map<string, SelectorPresenceMap>

export interface OcxOwnerNode extends HTMLStyleElement {
  ocxMatch: string
  ocxFrom: string
  ocxTo: string
  ocxScopeUniqueId: string
  ocxKeyFrames: string[]
}

export interface OcxCSSStyleSheet extends CSSStyleSheet {
  ownerNode: OcxOwnerNode
}

export interface MutationData {
  mutatedElements: Element[]
  skipMutationCheck: boolean
}
