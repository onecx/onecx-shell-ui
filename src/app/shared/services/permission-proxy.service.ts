import { Injectable } from '@angular/core';
import { PermissionsRpcTopic } from '@onecx/integration-interface';
import { PermissionsCacheService } from '@onecx/shell-core';
import { filter, firstValueFrom, map } from 'rxjs';
import { PermissionBffService } from '../generated';

@Injectable({ providedIn: 'root' })
export class PermissionProxyService {
  private permissionsTopic$ = new PermissionsRpcTopic();

  constructor(
    private permissionsService: PermissionBffService,
    private permissionsCacheService: PermissionsCacheService
  ) {}

  async init(): Promise<unknown> {
    this.permissionsTopic$
      .pipe(filter((message) => message.permissions === undefined))
      .subscribe(async (message) => {
        const permissions = {
          appId: message.appId,
          productName: message.productName,
          permissions: await firstValueFrom(
            this.permissionsCacheService.getPermissions(
              message.appId,
              message.productName,
              (appId, productName) =>
                this.permissionsService
                  .getPermissions({ appId, productName })
                  .pipe(map(({ permissions }) => permissions))
            )
          ),
        };
        this.permissionsTopic$.publish(permissions);
      });
    return Promise.resolve();
  }
}
