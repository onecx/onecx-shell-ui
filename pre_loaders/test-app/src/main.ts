function f() {
  import('./dummy')
}

import * as eD from '@angular/core/primitives/event-dispatch'
import * as aC from '@angular/core'
;(window as any)['onecxPreloaders'] ??= {}
;(window as any)['onecxPreloaders']['test-app'] = true

console.log('test-app debug:', (aC as any).debug)
