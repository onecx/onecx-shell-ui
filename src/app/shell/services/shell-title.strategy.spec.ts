import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Title } from '@angular/platform-browser'
import { provideRouter, Router, Routes, TitleStrategy } from '@angular/router'
import { ConfigurationServiceMock, provideConfigurationServiceMock } from '@onecx/angular-integration-interface/mocks'

import { MFE_ROUTE_DATA_KEY } from './routes.service'
import { MFE_TITLES_DISABLED_CONFIG_KEY, ShellTitleStrategy } from './shell-title.strategy'

@Component({ template: '' })
class DummyComponent {}

const routes: Routes = [
  { path: 'home', component: DummyComponent, title: 'Home' },
  {
    path: 'mfe',
    component: DummyComponent,
    title: 'Microfrontend',
    data: { [MFE_ROUTE_DATA_KEY]: true },
    children: [{ path: 'child', component: DummyComponent, title: 'Child' }]
  }
]

async function setup(config: Record<string, string>) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      provideConfigurationServiceMock(),
      { provide: TitleStrategy, useExisting: ShellTitleStrategy }
    ]
  })
  await TestBed.inject(ConfigurationServiceMock).init(config)
  TestBed.inject(Title).setTitle('Initial')
}

async function navigateTo(url: string) {
  await TestBed.inject(Router).navigateByUrl(url)
  await new Promise((resolve) => setTimeout(resolve))
}

function currentTitle() {
  return TestBed.inject(Title).getTitle()
}

describe('ShellTitleStrategy given the flag is not enabled', () => {
  it('when navigating to a shell page, then the route title is set', async () => {
    await setup({})

    await navigateTo('/home')

    expect(currentTitle()).toBe('Home')
  })

  it('when navigating to a microfrontend route, then the route title is set', async () => {
    await setup({})

    await navigateTo('/mfe')

    expect(currentTitle()).toBe('Microfrontend')
  })

  it('given the flag is set to false, when navigating to a microfrontend route, then the route title is set', async () => {
    await setup({ [MFE_TITLES_DISABLED_CONFIG_KEY]: 'false' })

    await navigateTo('/mfe')

    expect(currentTitle()).toBe('Microfrontend')
  })

  it('given no configuration is available, when navigating to a microfrontend route, then the route title is set', async () => {
    await setup({})
    jest.spyOn(TestBed.inject(ConfigurationServiceMock), 'getConfig').mockResolvedValue(undefined)

    await navigateTo('/mfe')

    expect(currentTitle()).toBe('Microfrontend')
  })
})

describe('ShellTitleStrategy given the configuration is still loading', () => {
  it('when navigating from a microfrontend route to a shell page, then the shell page title is not overridden', async () => {
    await setup({})
    let resolveConfig: (config: Record<string, string>) => void = () => undefined
    jest
      .spyOn(TestBed.inject(ConfigurationServiceMock), 'getConfig')
      .mockReturnValue(new Promise((resolve) => (resolveConfig = resolve)))

    await navigateTo('/mfe')
    await navigateTo('/home')
    resolveConfig({})
    await new Promise((resolve) => setTimeout(resolve))

    expect(currentTitle()).toBe('Home')
  })
})

describe('ShellTitleStrategy given the flag is enabled', () => {
  beforeEach(() => setup({ [MFE_TITLES_DISABLED_CONFIG_KEY]: ' True ' }))

  it('when navigating to a shell page, then the route title is set', async () => {
    await navigateTo('/home')

    expect(currentTitle()).toBe('Home')
  })

  it('when navigating to a microfrontend route, then the document title is not changed', async () => {
    const setTitleSpy = jest.spyOn(TestBed.inject(Title), 'setTitle')

    await navigateTo('/mfe')

    expect(setTitleSpy).not.toHaveBeenCalled()
  })

  it('when navigating to a child of a microfrontend route, then the document title is not changed', async () => {
    await navigateTo('/mfe/child')

    expect(currentTitle()).toBe('Initial')
  })

  it('when navigating from a shell page to a microfrontend route, then the shell page title is kept', async () => {
    await navigateTo('/home')

    await navigateTo('/mfe')

    expect(currentTitle()).toBe('Home')
  })
})
