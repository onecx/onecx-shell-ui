import { TestBed } from '@angular/core/testing'
import { Title } from '@angular/platform-browser'
import { RouterStateSnapshot } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { FakeTopic } from '@onecx/accelerator'
import { AppStateService } from '@onecx/angular-integration-interface'
import { DocumentTitle } from '@onecx/integration-interface'
import { of } from 'rxjs'
import { MFE_ROUTE_DATA_KEY } from 'src/app/app.routes'
import { ShellTitleStrategy } from './shell-title.strategy'

let mockDocumentTitleTopic: FakeTopic<DocumentTitle>
jest.mock('@onecx/integration-interface', () => ({
  ...jest.requireActual('@onecx/integration-interface'),
  DocumentTitleTopic: jest.fn(() => mockDocumentTitleTopic)
}))

const MFE_PATH = '/admin/theme/search'
const OTHER_MFE_PATH = '/admin/theme/detail'

interface Setup {
  strategy: ShellTitleStrategy
  setTitle: jest.Mock
}

function setup(routeTitle: string): Setup {
  const setTitle = jest.fn()
  mockDocumentTitleTopic = new FakeTopic<DocumentTitle>()
  TestBed.configureTestingModule({
    providers: [
      { provide: Title, useValue: { setTitle } },
      { provide: TranslateService, useValue: { stream: (key: string) => of(`translated ${key}`) } },
      { provide: AppStateService, useValue: { currentWorkspace$: { asObservable: () => of({ displayName: 'WS' }) } } }
    ]
  })
  const strategy = TestBed.inject(ShellTitleStrategy)
  jest.spyOn(strategy, 'buildTitle').mockReturnValue(routeTitle)
  return { strategy, setTitle }
}

function snapshotAt(path: string, data: Record<string, unknown>): RouterStateSnapshot {
  globalThis.history.pushState({}, '', path)
  const route = { outlet: 'primary', routeConfig: { data }, children: [] }
  return { root: { outlet: 'primary', children: [route] } } as unknown as RouterStateSnapshot
}

function publish(documentTitle: DocumentTitle): Promise<void> {
  return mockDocumentTitleTopic.publish(documentTitle)
}

const mfeRouteAt = (path: string) => snapshotAt(path, { [MFE_ROUTE_DATA_KEY]: true })

describe('ShellTitleStrategy on microfrontend routes', () => {
  let s: Setup
  beforeEach(() => (s = setup('Theme App')))
  afterEach(() => s.strategy.ngOnDestroy())

  it('given a title published for the current path, when navigating to the MFE route, then it replaces the route title', async () => {
    globalThis.history.pushState({}, '', MFE_PATH)
    await publish({ title: 'Theme Search', path: MFE_PATH })
    s.strategy.updateTitle(mfeRouteAt(MFE_PATH))
    expect(s.setTitle).toHaveBeenLastCalledWith('Theme Search - WS')
  })

  it('given an MFE route, when its title is published after the navigation, then the title is updated', async () => {
    s.strategy.updateTitle(mfeRouteAt(MFE_PATH))
    expect(s.setTitle).toHaveBeenLastCalledWith('Theme App - WS')
    await publish({ title: 'Theme Search', path: MFE_PATH })
    expect(s.setTitle).toHaveBeenLastCalledWith('Theme Search - WS')
  })

  it('given an MFE route, when a title is published for another path, then the route title is kept', async () => {
    s.strategy.updateTitle(mfeRouteAt(MFE_PATH))
    await publish({ title: 'Theme Detail', path: OTHER_MFE_PATH })
    expect(s.setTitle).toHaveBeenLastCalledWith('Theme App - WS')
  })

  it('given a published title, when a message without title follows, then the route title is used', async () => {
    s.strategy.updateTitle(mfeRouteAt(MFE_PATH))
    await publish({ title: 'Theme Search', path: MFE_PATH })
    await publish({ path: MFE_PATH })
    expect(s.setTitle).toHaveBeenLastCalledWith('Theme App - WS')
  })

  it('given a published title, when navigating to another MFE path, then the stale title is ignored', async () => {
    s.strategy.updateTitle(mfeRouteAt(MFE_PATH))
    await publish({ title: 'Theme Search', path: MFE_PATH })
    s.strategy.updateTitle(mfeRouteAt(OTHER_MFE_PATH))
    expect(s.setTitle).toHaveBeenLastCalledWith('Theme App - WS')
  })
})

describe('ShellTitleStrategy on shell pages', () => {
  it('given a title published for the current path, when on a shell page, then the shell title is used', async () => {
    const { strategy, setTitle } = setup('PAGE_TITLES.ABOUT')
    await publish({ title: 'Theme Search', path: MFE_PATH })
    strategy.updateTitle(snapshotAt(MFE_PATH, {}))
    expect(setTitle).toHaveBeenLastCalledWith('translated PAGE_TITLES.ABOUT - WS')
  })

  it('given the strategy, when it is destroyed, then the document title topic is destroyed', () => {
    const { strategy } = setup('Theme App')
    const destroy = jest.spyOn(mockDocumentTitleTopic, 'destroy')
    strategy.ngOnDestroy()
    expect(destroy).toHaveBeenCalled()
  })
})
