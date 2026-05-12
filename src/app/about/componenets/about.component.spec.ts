import { ComponentFixture, TestBed } from '@angular/core/testing'
import { AboutComponent } from './about.component'
import { TranslateModule } from '@ngx-translate/core'

describe('AboutComponent', () => {
  let fixture: ComponentFixture<AboutComponent>
  let component: AboutComponent

  function resetFederation() {
    (globalThis as any).__FEDERATION__ = {
      __INSTANCES__: [
        {
          name: 'onecx_shell_ui',
          shareScopeMap: {}
        }
      ]
    }
  }

  function mockFederation(entries: Record<string, Record<string, any>>) {
    (globalThis as any).__FEDERATION__ = {
      __INSTANCES__: [
        {
          name: 'onecx_shell_ui',
          shareScopeMap: entries
        } as any
      ]
    } as any
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent, TranslateModule.forRoot()]
    }).compileComponents()

    fixture = TestBed.createComponent(AboutComponent)
    component = fixture.componentInstance
  })

  afterEach(() => {
    resetFederation()
    jest.restoreAllMocks()
  })

  it('builds supportedAngularVersions from __FEDERATION__ entries', () => {
    mockFederation({
      default: {
        '@angular/core': {
          '18.2.14': { from: 'onecx-angular-18-loader', eager: false, loaded: 1 },
          '19.2.17': { from: 'onecx-angular-19-loader', eager: false },
          '20.3.15': { from: 'onecx-angular-20-loader', eager: false }
        }
      },
      otherScope: {
        '@angular/core': {
          '21.0.0': { from: 'onecx-angular-21-loader', eager: false }
        }
      }
    })

    fixture.detectChanges()

    expect(component.supportedAngularVersions).toHaveLength(4)
    expect(component.supportedAngularVersions[0]).toEqual(
      expect.objectContaining({
        name: 'Angular 18',
        version: '18.2.14',
        from: 'onecx-angular-18-loader',
        eager: false,
        loaded: 1
      })
    )

    expect(component.supportedAngularVersions[1]).toEqual(
      expect.objectContaining({
        name: 'Angular 19',
        version: '19.2.17',
        from: 'onecx-angular-19-loader',
        eager: false,
        loaded: 0
      })
    )

    expect(component.supportedAngularVersions[2]).toEqual(
      expect.objectContaining({
        name: 'Angular 20',
        version: '20.3.15',
        from: 'onecx-angular-20-loader',
        eager: false,
        loaded: 0
      })
    )

    expect(component.supportedAngularVersions[3]).toEqual(
      expect.objectContaining({
        name: 'Angular 21',
        version: '21.0.0',
        from: 'onecx-angular-21-loader',
        eager: false,
        loaded: 0,
        shareScope: 'otherScope'
      })
    )
  })

  it('filters out non boundary entries', () => {
    mockFederation({
      default: {
        '@angular/core': {
          '18.2.12': { from: 'onecx-workspace-ui', eager: false }, // not preloader or shell
          '18.2.14': { from: 'onecx-angular-18-loader', eager: false, loaded: 1 },
          '19.2.17': { from: 'onecx-angular-19-loader', eager: false },
          '20.3.15': { from: 'onecx-angular-20-loader', eager: false }
        }
      }
    })

    fixture.detectChanges()

    expect(component.supportedAngularVersions).toHaveLength(3)
    expect(component.supportedAngularVersions[0].version).toBe('18.2.14')
    expect(component.supportedAngularVersions[1].version).toBe('19.2.17')
    expect(component.supportedAngularVersions[2].version).toBe('20.3.15')
  })

  it('considers Shell packages', () => {
    mockFederation({
      default: {
        '@angular/core': {
          '18.2.12': { from: 'onecx-workspace-ui', eager: false }, // not preloader or shell
          '18.2.14': { from: 'onecx-angular-18-loader', eager: false, loaded: 1 },
          '19.2.17': { from: 'onecx-angular-19-loader', eager: false },
          '20.3.15': { from: 'onecx-angular-20-loader', eager: false },
          '21.0.0': { from: 'onecx_shell_ui', eager: false, useIn: ['consumer1'] } // shell package with consumer
        }
      }
    })

    fixture.detectChanges()

    expect(component.supportedAngularVersions).toHaveLength(4)
    expect(component.supportedAngularVersions[0].version).toBe('18.2.14')
    expect(component.supportedAngularVersions[1].version).toBe('19.2.17')
    expect(component.supportedAngularVersions[2].version).toBe('20.3.15')
    expect(component.supportedAngularVersions[3].version).toBe('21.0.0')
  })

  it('handles missing __FEDERATION__ gracefully', () => {
    fixture.detectChanges()

    expect(component.supportedAngularVersions).toHaveLength(0)
  })

  it('handles missing shell scope map gracefully', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    ;(globalThis as any).__FEDERATION__ = { __INSTANCES__: [] }

    fixture.detectChanges()

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'onecx_shell_ui shareScopeMap not found. Supported Angular versions cannot be determined.'
    )
    expect(component.supportedAngularVersions).toHaveLength(0)
  })
})
