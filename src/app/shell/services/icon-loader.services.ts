import { inject, Injectable } from '@angular/core'
import { debounceTime, filter, firstValueFrom, tap } from 'rxjs'
import { generateClassName, IconRequested, OnecxIcon } from '@onecx/integration-interface'
import { IconService, ThemeService } from '@onecx/angular-integration-interface'
import { IconBffService } from 'src/app/shared/generated'

@Injectable({ providedIn: 'root' })
export class ShellIconLoaderService {
  private themeRefId?: string
  private readonly iconService = inject(IconService)
  private readonly iconBffService = inject(IconBffService)
  private readonly themeService = inject(ThemeService)

  private requestedTypes = new Map<string, Set<'svg' | 'background' | 'background-before'>>()

  init(): void {
    this.themeService.currentTheme$.asObservable().subscribe((t) => (this.themeRefId = t?.name))

    this.iconService.iconLoaderTopic
      .pipe(
        filter((m): m is IconRequested => m.type === 'IconRequested'),
        tap((m) => this.recordRequestedType(m.name, m.classType)),
        debounceTime(100)
      )
      .subscribe(() => this.loadIcons())
  }

  private async loadIcons() {
    if (!this.themeRefId) return

    const missingIcons = Object.entries(window.onecxIcons)
      .filter(([, v]) => v === undefined)
      .map(([name]) => name)

    if (missingIcons.length > 0) {
      await this.loadMissingIcons(missingIcons, this.themeRefId)
    }

    this.requestedTypes.forEach((types, name) => {
      const icon = window.onecxIcons[name]
      if (icon?.body) {
        types.forEach((t) => this.injectCss(name, t, icon.body))
      }
      this.requestedTypes.delete(name)
    })
    this.iconService.iconLoaderTopic.publish({ type: 'IconsReceived' })
  }

  private async loadMissingIcons(missingIcons: string[], refId: string): Promise<void> {
    const res = await firstValueFrom(this.iconBffService.findIconsByNamesAndRefId(refId, { names: missingIcons }))

    const iconMap = new Map<string, OnecxIcon>()
    res?.icons?.forEach((i) => iconMap.set(i.name, i))

    missingIcons.forEach((name) => {
      const icon = iconMap.get(name) ?? null
      window.onecxIcons[name] = icon
    })
  }

  private injectCss(iconName: string, classType: 'svg' | 'background' | 'background-before', svgBody: string): void {
    const className = generateClassName(iconName, classType)
    if (document.getElementById(className)) return

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${svgBody}</svg>`
    const encoded = btoa(svg)

    const style = document.createElement('style')
    style.id = className

    if (classType === 'svg') {
      style.textContent = this.getSvgCss(className, encoded)
    } else if (classType === 'background') {
      style.textContent = this.getBackgroundCss(className, encoded)
    } else {
      style.textContent = this.getBackgroundBeforeCss(className, encoded)
    }

    document.head.appendChild(style)
  }

  private getBackgroundBeforeCss(className: string, encoded: string): string | null {
    return `.${className}{
                    display:inline-flex;
                }
                .${className}::before{
                    content:'';
                    display:inline-block;
                    width:1em;
                    height:1em;
                    background:url("data:image/svg+xml;base64,${encoded}") center/contain no-repeat;
                }`
  }

  private getBackgroundCss(className: string, encoded: string): string | null {
    return `.${className}{
                    display:inline-block;
                    width:1em;
                    height:1em;
                    background:url("data:image/svg+xml;base64,${encoded}") center/contain no-repeat;
                }`
  }

  private getSvgCss(className: string, encoded: string): string | null {
    return `.${className}{
                    display:inline-block;
                    width:1em;
                    height:1em;
                    --onecx-icon:url("data:image/svg+xml;base64,${encoded}");
                    mask:var(--onecx-icon) no-repeat center/contain;
                    -webkit-mask:var(--onecx-icon) no-repeat center/contain;
                    background-color:currentColor;
                }`
  }

  private recordRequestedType(name: string, type: IconRequested['classType']) {
    this.requestedTypes.get(name)?.add(type) ?? this.requestedTypes.set(name, new Set([type]))
  }
}
