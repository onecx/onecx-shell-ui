// Make shell federation instance is available globally
;(globalThis as any)['onecxFederationInstance'] = __FEDERATION__.__INSTANCES__[0]

window['onecxPreloaders'] ??= {}
import('./bootstrap').catch((err) => console.error(err))
