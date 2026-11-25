import { RouterStateSnapshot } from '@angular/router'
import { MFE_ROUTE_DATA_KEY } from 'src/app/app.routes'
import { isMfeRoute } from './mfe-route.utils'

interface RouteStub {
  outlet: string
  routeConfig: { data?: Record<string, unknown> } | null
  children: RouteStub[]
}

function route(outlet: string, data: Record<string, unknown> | undefined, children: RouteStub[] = []): RouteStub {
  return { outlet, routeConfig: data ? { data } : null, children }
}

function snapshot(root: RouteStub): RouterStateSnapshot {
  return { root } as unknown as RouterStateSnapshot
}

describe('isMfeRoute', () => {
  it('given a marked route deep in the primary outlet chain, when checked, then it is an MFE route', () => {
    const leaf = route('primary', { title: 'leaf' })
    const mfe = route('primary', { [MFE_ROUTE_DATA_KEY]: true }, [leaf])
    expect(isMfeRoute(snapshot(route('primary', undefined, [mfe])))).toBe(true)
  })

  it('given a shell page without marker, when checked, then it is not an MFE route', () => {
    const page = route('primary', { message: '' })
    expect(isMfeRoute(snapshot(route('primary', undefined, [page])))).toBe(false)
  })

  it('given a marked route only in a secondary outlet, when checked, then it is not an MFE route', () => {
    const secondary = route('aux', { [MFE_ROUTE_DATA_KEY]: true })
    expect(isMfeRoute(snapshot(route('primary', undefined, [secondary])))).toBe(false)
  })

  it('given a snapshot without root, when checked, then it is not an MFE route', () => {
    expect(isMfeRoute({} as RouterStateSnapshot)).toBe(false)
  })
})
