function f() {
  import('./dummy')
}

import('@angular/core').then((corePackage) => {
  ;(window as any)['onecxPreloaders'] ??= {}
  ;(window as any)['onecxPreloaders']['angular-19'] = true
})
