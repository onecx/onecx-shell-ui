import { inject, Injectable } from '@angular/core'
import { ZodSafeParseResult } from 'zod'

import { ThemeService } from '@onecx/angular-integration-interface'
import {
  CurrentThemesTopic,
  Theme as LibTheme,
  theme as themeSchema,
  ThemeProperties,
  ThemePropertiesV2
} from '@onecx/integration-interface'

import { OverrideType, Theme, ThemeOverride } from 'src/app/shared/generated'
import { MARKED_AS_WRAPPED } from '../utils/styles/shared-styles-host-overwrites.utils'

interface ParsedTheme {
  libThemeV1: LibTheme
  libThemeV2: ThemePropertiesV2 | undefined
  receivedThemeVersions: Array<1 | 2>
}

@Injectable({ providedIn: 'root' })
export class ThemeApplyService {
  private readonly themeService = inject(ThemeService)

  async applyTheme(theme: Theme): Promise<void> {
    const parsed = this.parseThemeProperties(theme)
    if (!parsed) return

    const { libThemeV1, libThemeV2, receivedThemeVersions } = parsed
    const customCssVariables = theme.customCssVariables
      ? (JSON.parse(theme.customCssVariables) as Record<string, string>)
      : undefined

    console.log(`🎨 Applying theme: ${libThemeV1.name}`)

    document.documentElement.style.setProperty(
      'color-scheme',
      receivedThemeVersions.includes(2) ? 'light dark' : 'only light'
    )

    await (this.themeService.currentThemes$ as CurrentThemesTopic).publish({
      ...theme,
      customCssVariables,
      properties: { v1: libThemeV1.properties, v2: libThemeV2 },
      versions: receivedThemeVersions
    })

    await this.themeService.currentTheme$.publish(libThemeV1)

    if (libThemeV1.properties) {
      this.applyThemeV1Variables(libThemeV1.properties)
    }
    if (libThemeV2) {
      this.applyThemeV2Variables(libThemeV2)
    }
    if (theme.overrides?.length) {
      this.applyCssOverrides(theme.overrides)
    }
    if (customCssVariables) {
      this.applyCustomCssVariables(customCssVariables)
    }
  }

  private parseThemeProperties(theme: Theme): ParsedTheme | undefined {
    if (this.isV2ThemeProperties(theme.properties)) {
      // themeSchema is an extremely deep z.ZodObject; resolving its method
      // signatures triggers TS2589. Erase its type before invoking safeParse and
      // re-type only the result against the manually maintained ThemeProperties.
      const parseResult = (themeSchema as any).safeParse(theme.properties) as ZodSafeParseResult<ThemeProperties>
      if (!parseResult.success) {
        console.error('Failed to parse theme v2 properties:', parseResult.error)
        return undefined
      }

      const receivedThemeVersions: Array<1 | 2> = []
      if (parseResult.data.v1) receivedThemeVersions.push(1)
      receivedThemeVersions.push(2)

      return {
        libThemeV1: { ...theme, properties: parseResult.data.v1 ?? {} },
        libThemeV2: parseResult.data.v2,
        receivedThemeVersions
      }
    }

    return {
      libThemeV1: { ...theme, properties: JSON.parse(theme.properties) as Record<string, Record<string, string>> },
      libThemeV2: undefined,
      receivedThemeVersions: [1]
    }
  }

  private isV2ThemeProperties(raw: string): boolean {
    return raw.includes('\\"usages\\":')
  }

  private applyThemeV1Variables(properties: Record<string, Record<string, string>>): void {
    for (const group of Object.values(properties)) {
      for (const [key, value] of Object.entries(group)) {
        document.documentElement.style.setProperty(`--${key}`, value)
      }
    }
  }

  private applyThemeV2Variables(theme: ThemePropertiesV2, path: string[] = ['--onecx-theme']): void {
    if (theme === null || theme === undefined) {
      return
    }
    if (typeof theme === 'object' && !Array.isArray(theme)) {
      if (this.isLightDarkObject(theme)) {
        const varName = path.join('-')
        const lightResolved = this.resolveThemeRefs(String((theme as any).light))
        const darkResolved = this.resolveThemeRefs(String((theme as any).dark))
        document.documentElement.style.setProperty(`${varName}-light`, lightResolved)
        document.documentElement.style.setProperty(`${varName}-dark`, darkResolved)
        document.documentElement.style.setProperty(varName, `light-dark(var(${varName}-light), var(${varName}-dark))`)
      } else {
        for (const [key, value] of Object.entries(theme)) {
          this.applyThemeV2Variables(value as ThemePropertiesV2, [...path, key])
        }
      }
    } else {
      const resolved = this.resolveThemeRefs(String(theme))
      document.documentElement.style.setProperty(path.join('-'), resolved)
    }
  }

  private isLightDarkObject(obj: object): obj is { light: string; dark: string } {
    return 'light' in obj && 'dark' in obj
  }

  private resolveThemeRefs(value: string): string {
    return value.replace(
      /\{\{([^}]+)\}\}/g,
      (_, referencePath: string) => `var(--onecx-theme-${referencePath.split('.').join('-')})`
    )
  }

  private applyCssOverrides(overrides: Array<ThemeOverride>): void {
    overrides
      .filter((ov) => ov.type === OverrideType.CSS && ov.value)
      .forEach((override) => {
        if (override.value) {
          const el = document.createElement('style')
          el.dataset['cssOverrides'] = ''
          el.dataset[MARKED_AS_WRAPPED] = ''
          el.append(override.value)
          document.head.appendChild(el)
        }
      })
  }

  private applyCustomCssVariables(variables: Record<string, string>): void {
    for (const [key, value] of Object.entries(variables)) {
      document.documentElement.style.setProperty(`--${key}`, value)
    }
  }
}
