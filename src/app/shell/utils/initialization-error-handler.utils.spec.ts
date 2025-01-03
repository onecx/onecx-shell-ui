import { TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { Router } from '@angular/router'

import { initializationErrorHandler } from './initialization-error-handler.utils'

describe('initializationErrorHandler', () => {
  let router: Router

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { navigate: jest.fn() } }]
    })

    router = TestBed.inject(Router)
  })

  it('should log the error and navigate to the error page with fragment parameters for ErrorEvent', () => {
    const errorEvent = new ErrorEvent('Network error', { error: { message: 'Network error occurred' } })
    const consoleSpy = jest.spyOn(console, 'error')

    initializationErrorHandler(errorEvent, router)

    expect(consoleSpy).toHaveBeenCalledWith(errorEvent)
    expect(router.navigate).toHaveBeenCalledWith(['portal-initialization-error-page'], {
      fragment: expect.stringContaining('message=Network+error+occurred')
    })

    consoleSpy.mockRestore()
  })

  it('should log the error and navigate to the error page with fragment parameters for HttpErrorResponse', () => {
    const httpErrorResponse = new HttpErrorResponse({
      error: {
        detail: 'Detail message',
        errorCode: '404',
        invalidParams: [{ name: 'param1', message: 'Invalid' }],
        params: [{ key: 'key1', value: 'value1' }]
      },
      status: 404,
      statusText: 'Not Found',
      url: 'http://example.com'
    })
    ;(httpErrorResponse as any)['message'] = 'HTTP error occurred'
    const consoleSpy = jest.spyOn(console, 'error')

    initializationErrorHandler(httpErrorResponse, router)

    expect(consoleSpy).toHaveBeenCalledWith(httpErrorResponse)
    expect(router.navigate).toHaveBeenCalledWith(['portal-initialization-error-page'], {
      fragment: expect.stringContaining('message=HTTP+error+occurred')
    })
    expect(router.navigate).toHaveBeenCalledWith(['portal-initialization-error-page'], {
      fragment: expect.stringContaining('detail=Detail+message')
    })
    expect(router.navigate).toHaveBeenCalledWith(['portal-initialization-error-page'], {
      fragment: expect.stringContaining('errorCode=404')
    })
    expect(router.navigate).toHaveBeenCalledWith(['portal-initialization-error-page'], {
      fragment: expect.stringContaining('invalidParams=%5Bparam1%3A+Invalid%5D')
    })
    expect(router.navigate).toHaveBeenCalledWith(['portal-initialization-error-page'], {
      fragment: expect.stringContaining('params=%5Bkey1%3A+value1%5D')
    })

    consoleSpy.mockRestore()
  })

  it('should handle unknown error types gracefully', () => {
    const unknownError = { message: 'Unknown error' }
    const consoleSpy = jest.spyOn(console, 'error')

    initializationErrorHandler(unknownError, router)

    expect(consoleSpy).toHaveBeenCalledWith(unknownError)
    expect(router.navigate).toHaveBeenCalledWith(['portal-initialization-error-page'], {
      fragment: expect.stringContaining('message=')
    })

    consoleSpy.mockRestore()
  })
})
