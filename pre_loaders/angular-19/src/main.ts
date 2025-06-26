function f() {
  import('./dummy')
}

import('@angular/core').then((corePackage) => {
  // dealing with inconsistencies between angular compilers prior to 19.2.0 with later runtimes
  // https://github.com/angular/angular/commit/db530856a86d7a9e958ee3489e4a83103d0a61ea
  ;(corePackage as any)['ɵɵInputTransformsFeature'] ??= (definition: any) => {
    definition.inputTransforms = {}
  }
  ;(window as any)['onecxPreloaders'] ??= {}
  ;(window as any)['onecxPreloaders']['angular-19'] = true
})
