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

import { OverrideType, Theme } from 'src/app/shared/generated'
import { MARKED_AS_WRAPPED } from '../utils/styles/shared-styles-host-overwrites.utils'

@Injectable({ providedIn: 'root' })
export class ThemeApplyService {
  private readonly themeService = inject(ThemeService)

  async applyTheme(theme: Theme): Promise<void> {
    let libThemeV1: LibTheme | undefined
    let libThemeV2: ThemePropertiesV2 | undefined
    let receivedThemeVersions: Array<1 | 2> = []
    if (theme.properties.includes('\\"usages\\":')) {
      // themeSchema is an extremely deep z.ZodObject; resolving its method
      // signatures triggers TS2589. Erase its type before invoking safeParse and
      // re-type only the result against the manually maintained ThemeProperties.
      const parseResult = (themeSchema as any).safeParse(theme.properties) as ZodSafeParseResult<ThemeProperties>
      if (!parseResult.success) {
        console.error('Failed to parse theme v2 properties:', parseResult.error)
        return
      }
      libThemeV2 = parseResult.data.v2
      libThemeV1 = {
        ...theme,
        properties: parseResult.data.v1 ?? {}
      }
      receivedThemeVersions = [2]
      if (parseResult.data.v1) {
        receivedThemeVersions.unshift(1)
      }
    } else {
      const parsedProperties = JSON.parse(theme.properties) as Record<string, Record<string, string>>
      receivedThemeVersions = [1]
      libThemeV1 = {
        ...theme,
        properties: parsedProperties
      }
    }

    console.log(`🎨 Applying theme: ${libThemeV1.name}`)

    await (this.themeService.currentThemes$ as CurrentThemesTopic).publish({
      ...theme,
      properties: {
        v1: libThemeV1.properties,
        v2: libThemeV2
      },
      versions: receivedThemeVersions
    })

    await this.themeService.currentTheme$.publish(libThemeV1)
    if (libThemeV1.properties) {
      for (const group of Object.values(libThemeV1.properties)) {
        for (const [key, value] of Object.entries(group)) {
          document.documentElement.style.setProperty(`--${key}`, value)
        }
      }
    }

    if (libThemeV2) {
      this.applyThemeV2Variables(libThemeV2)
    }

    if (libThemeV1.overrides && libThemeV1.overrides.length > 0) {
      libThemeV1.overrides
        .filter((ov) => ov.type === OverrideType.CSS)
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
  }

  private applyThemeV2Variables(theme: ThemePropertiesV2, path: string[] = ['--onecx-theme']): void {
    if (theme === null || theme === undefined) {
      return
    }
    if (typeof theme === 'object' && !Array.isArray(theme)) {
      for (const [key, value] of Object.entries(theme)) {
        this.applyThemeV2Variables(value as ThemePropertiesV2, [...path, key])
      }
    } else {
      const resolved = String(theme).replace(
        /\{\{([^}]+)\}\}/g,
        (_, referencePath: string) => `var(--onecx-theme-${referencePath.split('.').join('-')})`
      )
      document.documentElement.style.setProperty(path.join('-'), resolved)
    }
  }
}
