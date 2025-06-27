function f() {
  import('./dummy')
}

;(window as any)['onecxPreloaders'] ??= {}
;(window as any)['onecxPreloaders']['angular-20'] = true
