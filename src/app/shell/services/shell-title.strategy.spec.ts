import { TestBed } from '@angular/core/testing'
import { Title } from '@angular/platform-browser'
import { RouterStateSnapshot } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { AppStateService } from '@onecx/angular-integration-interface'
import { BehaviorSubject, NEVER, Observable } from 'rxjs'
import { ShellTitleStrategy } from './shell-title.strategy'

describe('ShellTitleStrategy', () => {
  let strategy: ShellTitleStrategy
  let setTitle: jest.Mock
  let workspace$: BehaviorSubject<any>
  let translations$: BehaviorSubject<Record<string, string>>
  let routeTitle: string | undefined

  const translateMock = {
    stream: (key: string) =>
      new Observable<string>((subscriber) => {
        const sub = translations$.subscribe((t) => subscriber.next(t[key] ?? key))
        return () => sub.unsubscribe()
      })
  }

  function update() {
    strategy.updateTitle({} as RouterStateSnapshot)
  }

  beforeEach(() => {
    setTitle = jest.fn()
    routeTitle = undefined
    workspace$ = new BehaviorSubject<any>({ displayName: 'My Workspace', workspaceName: 'my-ws' })
    translations$ = new BehaviorSubject<Record<string, string>>({ 'PAGE_TITLES.ABOUT': 'About Shell' })
    TestBed.configureTestingModule({
      providers: [
        { provide: Title, useValue: { setTitle } },
        { provide: TranslateService, useValue: translateMock },
        { provide: AppStateService, useValue: { currentWorkspace$: { asObservable: () => workspace$ } } }
      ]
    })
    strategy = TestBed.inject(ShellTitleStrategy)
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
