function f() {
  import('./dummy')
}

;(window as any)['onecxPreloaders'] ??= {}
;(window as any)['onecxPreloaders']['react-19'] = true
