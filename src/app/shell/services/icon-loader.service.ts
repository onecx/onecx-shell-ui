import { inject, Injectable } from '@angular/core'
import { debounceTime, filter, firstValueFrom } from 'rxjs'
import { generateClassName, IconRequested, IconCache } from '@onecx/integration-interface'
import { IconService as IconServiceInterface, ThemeService } from '@onecx/angular-integration-interface'
import { IconBffService } from 'src/app/shared/generated'
import { ensureProperty } from '@onecx/accelerator'

@Injectable({ providedIn: 'root' })
export class ShellIconLoaderService {
  private themeRefPromise?: Promise<string | undefined>

  private readonly iconService = inject(IconServiceInterface)
  private readonly iconBffService = inject(IconBffService)
  private readonly themeService = inject(ThemeService)

  init(): void {
    this.themeRefPromise = firstValueFrom(this.themeService.currentTheme$)
      .then((t) => t?.name)
      .catch((err) => {
        console.error('Error fetching current theme during initialization:', err)
        return undefined
      })

    this.iconService.iconTopic
      .pipe(
        filter((m): m is IconRequested => m.type === 'IconRequested'),
        debounceTime(100)
      )
      .subscribe(() => this.loadIcons())
  }

  private async loadIcons() {
    const missingIcons = Object.entries(globalThis.onecxIcons!)
      .filter(([, v]) => v === undefined)
      .map(([name]) => name)

    if (missingIcons.length === 0) return

    await this.loadMissingIcons(missingIcons)
    this.iconService.iconTopic.publish({ type: 'IconsReceived' })
  }

  private async loadMissingIcons(missingIcons: string[]): Promise<void> {
    let res: { icons?: IconCache[] } | undefined
    try {
      const refId = await this.themeRefPromise
      if (!refId) throw new Error('No theme reference ID available for icon request')
      res = await firstValueFrom(this.iconBffService.findIconsByNamesAndRefId(refId, { names: missingIcons }))
    } catch (err) {
      console.error('Error loading missing icons:', err)
    }

    const iconMap = new Map<string, IconCache>()
    res?.icons?.forEach((i) => iconMap.set(i.name, i))

    const style = this.ensureGlobalStyle()
    missingIcons.forEach((name) => {
      const icon = iconMap.get(name) ?? null
      ensureProperty(globalThis, ['onecxIcons', name], icon)
      if (icon?.body) {
        this.injectCss(name, icon.body, style)
      }
    })
  }

  private ensureGlobalStyle(): HTMLStyleElement {
    const styleId = 'onecx-icons-css'
    let style = document.getElementById(styleId) as HTMLStyleElement
    if (!style) {
      style = document.createElement('style')
      style.id = styleId
      document.head.appendChild(style)
    }
    return style
  }

  private injectCss(iconName: string, svgBody: string, style: HTMLStyleElement): void {
    const svgClass = generateClassName(iconName, 'svg')
    const bgClass = generateClassName(iconName, 'background')
    const beforeClass = generateClassName(iconName, 'background-before')

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${svgBody}</svg>`
    const encoded = btoa(svg)

    style.textContent += `
    ${this.getSvgCss(svgClass, encoded)}
    ${this.getBackgroundCss(bgClass, encoded)}
    ${this.getBackgroundBeforeCss(beforeClass, encoded)}
  `
  }

  private getBackgroundBeforeCss(className: string, encoded: string): string {
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

  private getBackgroundCss(className: string, encoded: string): string {
    return `.${className}{
                    display:inline-block;
                    width:1em;
                    height:1em;
                    background:url("data:image/svg+xml;base64,${encoded}") center/contain no-repeat;
                }`
  }

  private getSvgCss(className: string, encoded: string): string {
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
}
