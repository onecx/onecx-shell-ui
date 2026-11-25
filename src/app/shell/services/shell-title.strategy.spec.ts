import { TestBed } from '@angular/core/testing'
import { Title } from '@angular/platform-browser'
import { RouterStateSnapshot } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { AppStateService, ConfigurationService } from '@onecx/angular-integration-interface'
import { BehaviorSubject, NEVER, Observable } from 'rxjs'
import { MFE_ROUTE_DATA_KEY } from 'src/app/app.routes'
import { MFE_TITLES_DISABLED_CONFIG_KEY, ShellTitleStrategy } from './shell-title.strategy'

/** Test state of a {@link ShellTitleStrategy} created by {@link setupShellTitleStrategy}. */
interface ShellTitleStrategyFixture {
  strategy: ShellTitleStrategy
  setTitle: jest.Mock
  workspace$: BehaviorSubject<unknown>
  translations$: BehaviorSubject<Record<string, string>>
}

function translateMock(translations$: BehaviorSubject<Record<string, string>>) {
  return {
    stream: (key: string) =>
      new Observable<string>((subscriber) => {
        const sub = translations$.subscribe((t) => subscriber.next(t[key] ?? key))
        return () => sub.unsubscribe()
      })
  }
}

/**
 * Configures the TestBed with mocked collaborators and creates the strategy.
 * @param config the shell configuration returned by the ConfigurationService
 */
function setupShellTitleStrategy(config?: Record<string, string>): ShellTitleStrategyFixture {
  const setTitle = jest.fn()
  const workspace$ = new BehaviorSubject<unknown>({ displayName: 'My Workspace', workspaceName: 'my-ws' })
  const translations$ = new BehaviorSubject<Record<string, string>>({ 'PAGE_TITLES.ABOUT': 'About Shell' })
  TestBed.configureTestingModule({
    providers: [
      { provide: Title, useValue: { setTitle } },
      { provide: TranslateService, useValue: translateMock(translations$) },
      { provide: AppStateService, useValue: { currentWorkspace$: { asObservable: () => workspace$ } } },
      { provide: ConfigurationService, useValue: { getConfig: () => Promise.resolve(config) } }
    ]
  })
  return { strategy: TestBed.inject(ShellTitleStrategy), setTitle, workspace$, translations$ }
}

describe('ShellTitleStrategy', () => {
  let strategy: ShellTitleStrategy
  let setTitle: jest.Mock
  let workspace$: BehaviorSubject<unknown>
  let translations$: BehaviorSubject<Record<string, string>>
  let routeTitle: string | undefined

  function update() {
    strategy.updateTitle({} as RouterStateSnapshot)
  }

  beforeEach(() => {
    routeTitle = undefined
    ;({ strategy, setTitle, workspace$, translations$ } = setupShellTitleStrategy())
    jest.spyOn(strategy, 'buildTitle').mockImplementation(() => routeTitle)
  })

  afterEach(() => strategy.ngOnDestroy())

  it('translates shell titles and appends the workspace', () => {
    routeTitle = 'PAGE_TITLES.ABOUT'
    update()
    expect(setTitle).toHaveBeenLastCalledWith('About Shell - My Workspace')
  })

  it('updates the title on language change without a new navigation', () => {
    routeTitle = 'PAGE_TITLES.ABOUT'
    update()
    translations$.next({ 'PAGE_TITLES.ABOUT': 'Über Shell' })
    expect(setTitle).toHaveBeenLastCalledWith('Über Shell - My Workspace')
  })

  it('never writes a raw key while translations are loading', () => {
    translations$.next({})
    routeTitle = 'PAGE_TITLES.ABOUT'
    update()
    expect(setTitle).toHaveBeenCalledTimes(1)
    expect(setTitle).toHaveBeenLastCalledWith('My Workspace')
    expect(setTitle.mock.calls.flat().join()).not.toContain('PAGE_TITLES')
    translations$.next({ 'PAGE_TITLES.ABOUT': 'About Shell' })
    expect(setTitle).toHaveBeenLastCalledWith('About Shell - My Workspace')
  })

  it('uses the (deepest) MFE route title as is', () => {
    routeTitle = 'Themes'
    update()
    expect(setTitle).toHaveBeenLastCalledWith('Themes - My Workspace')
  })

  it('falls back to the app displayName when the leaf has no title', () => {
    // run the real Angular buildTitle; only the (internal) resolved-title lookup is replaced
    jest.mocked(strategy.buildTitle).mockRestore()
    jest.spyOn(strategy, 'getResolvedTitleForRoute').mockImplementation((route: any) => route.data?.title)
    const leaf = { outlet: 'primary', data: {}, children: [] }
    const parent = { outlet: 'primary', data: { title: 'Theme App' }, children: [leaf] }
    const root = { outlet: 'primary', data: {}, children: [parent] }
    strategy.updateTitle({ root } as unknown as RouterStateSnapshot)
    expect(setTitle).toHaveBeenLastCalledWith('Theme App - My Workspace')
  })

  it('uses only the page title when no workspace is available', () => {
    workspace$.next(undefined)
    routeTitle = 'Themes'
    update()
    expect(setTitle).toHaveBeenLastCalledWith('Themes')
  })

  it('falls back to the workspace name when it has no displayName', () => {
    workspace$.next({ workspaceName: 'my-ws' })
    routeTitle = 'Themes'
    update()
    expect(setTitle).toHaveBeenLastCalledWith('Themes - my-ws')
  })

  it('does not blank the title when neither route title nor workspace exist', () => {
    workspace$.next(undefined)
    update()
    expect(setTitle).not.toHaveBeenCalled()
  })

  it('does not wait for the workspace to be published', () => {
    const never = { asObservable: () => NEVER }
    TestBed.inject(AppStateService).currentWorkspace$ = never as any
    routeTitle = 'Themes'
    update()
    expect(setTitle).toHaveBeenLastCalledWith('Themes')
  })
})

function routeSnapshot(data: Record<string, unknown>): RouterStateSnapshot {
  const route = { outlet: 'primary', routeConfig: { data }, children: [] }
  return { root: { outlet: 'primary', routeConfig: null, children: [route] } } as unknown as RouterStateSnapshot
}

const mfeRoute = routeSnapshot({ [MFE_ROUTE_DATA_KEY]: true })
const shellPage = routeSnapshot({})

function flushConfig() {
  return new Promise((resolve) => setTimeout(resolve))
}

describe('ShellTitleStrategy with ONECX_PORTAL_MFE_TITLES_DISABLED', () => {
  let fixture: ShellTitleStrategyFixture

  function setup(value?: string) {
    fixture = setupShellTitleStrategy(value === undefined ? undefined : { [MFE_TITLES_DISABLED_CONFIG_KEY]: value })
    jest.spyOn(fixture.strategy, 'buildTitle').mockReturnValue('Themes')
  }

  afterEach(() => fixture.strategy.ngOnDestroy())

  it('given the switch is not configured, when navigating to an MFE route, then the shell sets the title', async () => {
    setup()
    fixture.strategy.updateTitle(mfeRoute)
    await flushConfig()
    expect(fixture.setTitle).toHaveBeenLastCalledWith('Themes - My Workspace')
  })

  it('given the switch is off, when navigating to an MFE route, then the shell sets the title', async () => {
    setup('false')
    fixture.strategy.updateTitle(mfeRoute)
    await flushConfig()
    expect(fixture.setTitle).toHaveBeenLastCalledWith('Themes - My Workspace')
  })

  it('given the switch is on, when navigating to an MFE route, then the shell does not set the title', async () => {
    setup(' True ')
    fixture.strategy.updateTitle(mfeRoute)
    await flushConfig()
    expect(fixture.setTitle).not.toHaveBeenCalled()
  })

  it('given the switch is on, when navigating to a shell page, then the shell sets the title', async () => {
    setup('true')
    fixture.strategy.updateTitle(shellPage)
    await flushConfig()
    expect(fixture.setTitle).toHaveBeenLastCalledWith('Themes - My Workspace')
  })

  it('given the switch is on, when the workspace changes after navigating to an MFE route, then the shell keeps the MFE title', async () => {
    setup('true')
    fixture.strategy.updateTitle(shellPage)
    fixture.strategy.updateTitle(mfeRoute)
    await flushConfig()
    fixture.setTitle.mockClear()
    fixture.workspace$.next({ displayName: 'Other Workspace' })
    expect(fixture.setTitle).not.toHaveBeenCalled()
  })
})
