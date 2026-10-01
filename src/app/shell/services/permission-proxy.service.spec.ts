import { TestBed } from '@angular/core/testing'
import { Observable, of, Subject } from 'rxjs'
import { PermissionBffService } from 'src/app/shared/generated'
import { PermissionProxyService } from './permission-proxy.service'
import { PermissionsCacheService } from './permissions-cache.service'

const mockTopics: Subject<{ appId: string; productName: string; permissions?: string[] }>[] = []
const mockPublishers: jest.Mock[] = []

jest.mock('@onecx/integration-interface', () => {
  const actual = jest.requireActual('@onecx/integration-interface')
  class PermissionsRpcTopic extends Subject<{ appId: string; productName: string; permissions?: string[] }> {
    publish = jest.fn((message: { appId: string; productName: string; permissions?: string[] }) => this.next(message))

    constructor() {
      super()
      mockTopics.push(this)
      mockPublishers.push(this.publish)
    }
  }
  return { ...actual, PermissionsRpcTopic }
})

describe('PermissionProxyService', () => {
  beforeEach(() => {
    mockTopics.length = 0
    mockPublishers.length = 0
  })

  it('responds to permission requests with the loaded permissions', async () => {
    const getPermissions = jest.fn(() => of({ permissions: ['read'] }))
    TestBed.configureTestingModule({
      providers: [
        PermissionProxyService,
        PermissionsCacheService,
        { provide: PermissionBffService, useValue: { getPermissions } }
      ]
    })
    const service = TestBed.inject(PermissionProxyService)
    await service.init()

    mockTopics[0].next({ appId: 'shell', productName: 'portal' })

    expect(getPermissions).toHaveBeenCalledWith({ appId: 'shell', productName: 'portal' })
    expect(mockPublishers[0]).toHaveBeenCalledWith({
      appId: 'shell',
      productName: 'portal',
      permissions: ['read']
    })
  })

  it('publishes an empty result after permission requests keep failing', async () => {
    let attempts = 0
    const request = new Observable<{ permissions: string[] }>((subscriber) => {
      attempts++
      subscriber.error(new Error('network error'))
    })
    const getPermissions = jest.fn(() => request)
    const error = jest.spyOn(console, 'error').mockImplementation()
    TestBed.configureTestingModule({
      providers: [
        PermissionProxyService,
        PermissionsCacheService,
        { provide: PermissionBffService, useValue: { getPermissions } }
      ]
    })
    const service = TestBed.inject(PermissionProxyService)
    await service.init()

    mockTopics[0].next({ appId: 'shell', productName: 'portal' })
    await new Promise((resolve) => setTimeout(resolve, 1600))

    expect(getPermissions).toHaveBeenCalledTimes(1)
    expect(attempts).toBe(4)
    expect(error).toHaveBeenCalledWith('Unable to load permissions for ', 'shell', 'portal')
    expect(mockPublishers[0]).toHaveBeenCalledWith({
      appId: 'shell',
      productName: 'portal',
      permissions: []
    })
    error.mockRestore()
  })
})
