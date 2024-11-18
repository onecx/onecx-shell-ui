import { Injectable } from '@angular/core'
import { PermissionsRpcTopic } from '@onecx/integration-interface'
import { PermissionsCacheService } from '@onecx/shell-core'
import { catchError, filter, map, mergeMap, of, retry } from 'rxjs'
import { PermissionBffService } from 'src/app/shared/generated'

@Injectable({ providedIn: 'root' })
export class PermissionProxyService {
  private permissionsTopic$ = new PermissionsRpcTopic()

  constructor(
    private permissionsService: PermissionBffService,
    private permissionsCacheService: PermissionsCacheService
  ) {}

  async init(): Promise<unknown> {
    this.permissionsTopic$
      .pipe(
        filter((message) => message.permissions === undefined),
        mergeMap((message) =>
          this.permissionsCacheService
            .getPermissions(message.appId, message.productName, (appId, productName) =>
              this.permissionsService.getPermissions({ appId, productName }).pipe(
                retry({ delay: 500, count: 3 }),
                catchError(() => {
                  console.error('Unable to load permissions for ', appId, productName)
                  return of({ permissions: [] })
                }),
                map(({ permissions }) => permissions)
              )
            )
            .pipe(map((permissions) => ({ message, permissions })))
        )
      )
      .subscribe(({ message, permissions }) => {
        const answer = {
          appId: message.appId,
          productName: message.productName,
          permissions: permissions
        }
        this.permissionsTopic$.publish(answer)
      })
    return Promise.resolve()
  }
}
