import { of } from 'rxjs'

import { PermissionsCacheService } from './permissions-cache.service'

describe('PermissionsCacheService', () => {
  it('reuses the observable for each app and product pair', () => {
    const service = new PermissionsCacheService()
    const load = jest.fn((appId: string, productName: string) => of([`${appId}:${productName}`]))

    const cached = service.getPermissions('app', 'product', load)
    const repeated = service.getPermissions('app', 'product', load)
    const different = service.getPermissions('app', 'other', load)
    const values: string[][] = []
    cached.subscribe((permissions) => values.push(permissions))
    repeated.subscribe((permissions) => values.push(permissions))
    different.subscribe((permissions) => values.push(permissions))

    expect(load).toHaveBeenCalledTimes(2)
    expect(values).toEqual([['app:product'], ['app:product'], ['app:other']])
    expect(repeated).toBe(cached)
  })
})
