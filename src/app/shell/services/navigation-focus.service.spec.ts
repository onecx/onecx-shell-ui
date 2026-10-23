import { LiveAnnouncer } from '@angular/cdk/a11y'
import { TestBed } from '@angular/core/testing'
import { Event, NavigationEnd, NavigationSkipped, NavigationSkippedCode, Router } from '@angular/router'
import { Subject } from 'rxjs'

import { NavigationFocusService, TITLE_MAX_WAIT_MS, TITLE_SETTLE_MS } from './navigation-focus.service'

describe('NavigationFocusService', () => {
  let events: Subject<Event>
  let announce: jest.Mock
  let service: NavigationFocusService
  let navigationId: number
  let menuLink: HTMLAnchorElement
  let wrapper: HTMLElement
  let main: HTMLElement

  const navigateTo = (url: string) => events.next(new NavigationEnd(++navigationId, url, url))
  const interact = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
  const flushRender = () => jest.advanceTimersByTime(0)
  const flushTitle = () => jest.advanceTimersByTime(TITLE_SETTLE_MS)
  const trackScrollTop = (element: HTMLElement, initial: number) => {
    let value = initial
    Object.defineProperty(element, 'scrollTop', {
      configurable: true,
      get: () => value,
      set: (next: number) => (value = next)
    })
  }
  const setTitle = async (title: string) => {
    document.title = title
    // MutationObserver callbacks run as microtasks
    await Promise.resolve()
  }

  beforeEach(() => {
    jest.useFakeTimers()
    navigationId = 0
    events = new Subject<Event>()
    announce = jest.fn().mockResolvedValue(undefined)
    document.title = 'Start - Workspace'
    document.body.innerHTML = `
      <nav><a id="menu-link" href="/b">Menu entry</a></nav>
      <div class="onecx-body-center" id="wrapper">
        <main class="onecx-body" id="ocx_main_content" tabindex="-1">
          <h1>Page</h1><button id="inside">Inside</button>
        </main>
      </div>
      <div role="dialog" aria-modal="true"><button id="dialog-button">OK</button></div>`
    menuLink = document.getElementById('menu-link') as HTMLAnchorElement
    wrapper = document.getElementById('wrapper') as HTMLElement
    main = document.getElementById('ocx_main_content') as HTMLElement

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events } },
        { provide: LiveAnnouncer, useValue: { announce } }
      ]
    })
    service = TestBed.inject(NavigationFocusService)
    service.init()
    navigateTo('/workspace/app-a')
  })

  afterEach(() => {
    service.ngOnDestroy()
    jest.useRealTimers()
    document.body.innerHTML = ''
  })

  it('moves focus to the main region, scrolls to top and announces the title after a path change', () => {
    trackScrollTop(wrapper, 800)
    trackScrollTop(main, 120)
    menuLink.focus()
    interact()

    navigateTo('/workspace/app-b')
    flushRender()

    expect(document.activeElement).toBe(main)
    expect(wrapper.scrollTop).toBe(0)
    expect(main.scrollTop).toBe(0)
    expect(announce).not.toHaveBeenCalled()

    flushTitle()
    expect(announce).toHaveBeenCalledTimes(1)
    expect(announce).toHaveBeenCalledWith('Start - Workspace', 'polite')
  })

  it('handles navigations within one MFE and across MFEs, never leaving focus on the body', () => {
    interact()
    for (const url of ['/workspace/app-a/search', '/workspace/app-a/details/1', '/workspace/app-b']) {
      menuLink.focus()
      navigateTo(url)
      flushRender()
      expect(document.activeElement).toBe(main)
      flushTitle()
    }
    expect(announce).toHaveBeenCalledTimes(3)
  })

  it('announces the title once it is stable, after asynchronous title updates', async () => {
    interact()
    navigateTo('/workspace/app-b')
    jest.advanceTimersByTime(TITLE_SETTLE_MS - 100)
    await setTitle('Themes - Workspace')
    jest.advanceTimersByTime(TITLE_SETTLE_MS - 100)
    expect(announce).not.toHaveBeenCalled()

    jest.advanceTimersByTime(100)
    expect(announce).toHaveBeenCalledTimes(1)
    expect(announce).toHaveBeenCalledWith('Themes - Workspace', 'polite')
  })

  it('ignores head mutations that do not change the title', async () => {
    interact()
    navigateTo('/workspace/app-b')
    jest.advanceTimersByTime(TITLE_SETTLE_MS - 100)
    document.head.appendChild(document.createElement('style'))
    await Promise.resolve()
    jest.advanceTimersByTime(100)

    expect(announce).toHaveBeenCalledTimes(1)
  })

  it('announces at the latest after the maximum wait when the title keeps changing', async () => {
    interact()
    navigateTo('/workspace/app-b')
    for (let elapsed = 0; elapsed < TITLE_MAX_WAIT_MS; elapsed += TITLE_SETTLE_MS / 2) {
      await setTitle(`Title ${elapsed}`)
      jest.advanceTimersByTime(TITLE_SETTLE_MS / 2)
    }

    expect(announce).toHaveBeenCalledTimes(1)
  })

  it('announces only once for a redirect chain', () => {
    interact()
    navigateTo('/workspace/app-b')
    navigateTo('/workspace/app-b/search')
    flushRender()
    flushTitle()

    expect(announce).toHaveBeenCalledTimes(1)
  })

  it('does nothing on the first navigation', () => {
    const freshService = TestBed.runInInjectionContext(() => new NavigationFocusService())
    freshService.init()
    interact()
    menuLink.focus()
    navigateTo('/workspace/app-b')
    flushRender()
    flushTitle()

    // only the already initialised service reacts; the fresh one treats this as its first load
    expect(announce).toHaveBeenCalledTimes(1)
    freshService.ngOnDestroy()
  })

  it('does not steal focus before the user interacted (initial load redirects)', () => {
    menuLink.focus()
    navigateTo('/workspace/app-a/search')
    flushRender()
    flushTitle()

    expect(document.activeElement).toBe(menuLink)
    expect(announce).not.toHaveBeenCalled()
  })

  it('also treats a pointer interaction as user interaction', () => {
    document.dispatchEvent(new Event('pointerdown'))
    navigateTo('/workspace/app-b')
    flushRender()

    expect(document.activeElement).toBe(main)
  })

  it.each(['/workspace/app-a?page=2', '/workspace/app-a#section'])(
    'does not change focus on query or fragment only navigation (%s)',
    (url) => {
      interact()
      menuLink.focus()
      navigateTo(url)
      flushRender()
      flushTitle()

      expect(document.activeElement).toBe(menuLink)
      expect(announce).not.toHaveBeenCalled()
    }
  )

  it('does not react to skipped navigations', () => {
    interact()
    menuLink.focus()
    events.next(
      new NavigationSkipped(
        ++navigationId,
        '/workspace/app-b',
        'same url',
        NavigationSkippedCode.IgnoredSameUrlNavigation
      )
    )
    flushRender()
    flushTitle()

    expect(document.activeElement).toBe(menuLink)
    expect(announce).not.toHaveBeenCalled()
  })

  it('leaves focus that the MFE placed inside the main region', () => {
    interact()
    const inside = document.getElementById('inside') as HTMLButtonElement
    inside.focus()
    navigateTo('/workspace/app-b')
    flushRender()
    flushTitle()

    expect(document.activeElement).toBe(inside)
    expect(announce).toHaveBeenCalledTimes(1)
  })

  it('does not interrupt a dialog that manages its own focus', () => {
    interact()
    const dialogButton = document.getElementById('dialog-button') as HTMLButtonElement
    dialogButton.focus()
    navigateTo('/workspace/app-b')
    flushRender()
    flushTitle()

    expect(document.activeElement).toBe(dialogButton)
  })

  it('moves focus to the main region when it falls to the body after a late content replacement', () => {
    interact()
    const inside = document.getElementById('inside') as HTMLButtonElement
    inside.focus()
    navigateTo('/workspace/app-b')
    flushRender()
    expect(document.activeElement).toBe(inside)

    inside.remove()
    expect(document.activeElement).toBe(document.body)
    flushTitle()

    expect(document.activeElement).toBe(main)
  })

  it('does not move focus at title time when focus is still on an element', () => {
    interact()
    navigateTo('/workspace/app-b')
    flushRender()
    menuLink.focus()
    flushTitle()

    expect(document.activeElement).toBe(menuLink)
  })

  it('makes a main region without tabindex programmatically focusable', () => {
    document.body.innerHTML = '<div class="onecx-body"><p>content</p></div>'
    const body = document.querySelector<HTMLElement>('.onecx-body') as HTMLElement
    interact()
    navigateTo('/workspace/app-b')
    flushRender()

    expect(body.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(body)
  })

  it('still announces the title when there is no main region', () => {
    document.body.innerHTML = '<p>no main</p>'
    interact()
    navigateTo('/workspace/app-b')
    flushRender()
    flushTitle()

    expect(document.activeElement).toBe(document.body)
    expect(announce).toHaveBeenCalledTimes(1)
  })

  it('does not announce an empty title', () => {
    document.title = '  '
    interact()
    navigateTo('/workspace/app-b')
    flushRender()
    flushTitle()

    expect(announce).not.toHaveBeenCalled()
  })

  it('initialises only once and cancels pending work on destroy', () => {
    service.init()
    interact()
    menuLink.focus()
    navigateTo('/workspace/app-b')
    service.ngOnDestroy()
    flushRender()
    flushTitle()

    expect(document.activeElement).toBe(menuLink)
    expect(announce).not.toHaveBeenCalled()

    navigateTo('/workspace/app-c')
    flushRender()
    expect(document.activeElement).toBe(menuLink)
  })
})
