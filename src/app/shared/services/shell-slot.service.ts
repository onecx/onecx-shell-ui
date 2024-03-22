import { loadRemoteModule } from '@angular-architects/module-federation';
import { Injectable, Type } from '@angular/core';
import { RemoteComponentsTopic } from '@onecx/integration-interface';
import { SlotService } from '@onecx/angular-remote-components';
import { Observable, from, map, mergeMap, zip, firstValueFrom } from 'rxjs';
import {
  RemoteComponent,
  RemoteComponentMapping,
  UserBffService,
} from '../generated';
import { RemoteComponentInfo } from '@onecx/angular-remote-components';
import { PermissionsTopic } from '@onecx/integration-interface';
import { PermissionsCacheService } from '@onecx/shell-core';

@Injectable()
export class ShellSlotService implements SlotService {
  remoteComponents = new RemoteComponentsTopic();
  remoteComponentMappings: RemoteComponentMapping[] | undefined;
  private permissionsTopic$ = new PermissionsTopic();

  constructor(
    private userService: UserBffService,
    private permissionsCacheService: PermissionsCacheService
  ) {}

  async init(): Promise<void> {
    return Promise.resolve();
  }

  getComponentsForSlot(slotName: string): Observable<
    {
      componentType: Type<unknown>;
      remoteComponent: RemoteComponentInfo;
      permissions: string[];
    }[]
  > {
    return this.remoteComponents.pipe(
      map((remoteComponents) =>
        (
          this.remoteComponentMappings?.filter(
            (remoteComponentMappings) =>
              remoteComponentMappings.slotName === slotName
          ) ?? []
        )
          .map((remoteComponentMappings) =>
            remoteComponents.find(
              (rc) => rc.name === remoteComponentMappings.remoteComponent
            )
          )
          .filter((remoteComponent) => !!remoteComponent)
          .map((remoteComponent) => remoteComponent as RemoteComponent)
      ),
      mergeMap((remoteComponents: RemoteComponent[]) =>
        zip(
          remoteComponents.map((remoteComponent) =>
            this.permissionsCacheService
              .getPermissions(
                remoteComponent.appId,
                remoteComponent.productName,
                (appId, productName) =>
                  this.userService
                    .getPermissions({ appId, productName })
                    .pipe(map(({ permissions }) => permissions))
              )
              .pipe(map((permissions) => ({ remoteComponent, permissions })))
          )
        )
      ),
      mergeMap((infos) =>
        from(
          Promise.all(
            infos.map(({ remoteComponent, permissions }) =>
              this.loadComponent(remoteComponent).then((componentType) => ({
                componentType,
                remoteComponent,
                permissions,
              }))
            )
          )
        )
      )
    );
  }

  private async loadComponent(component: {
    remoteEntryUrl: string;
    exposedModule: string;
  }): Promise<Type<unknown>> {
    try {
      const m = await loadRemoteModule({
        type: 'module',
        remoteEntry: component.remoteEntryUrl,
        exposedModule: './' + component.exposedModule,
      });
      return m[component.exposedModule];
    } catch (e) {
      console.log(
        'Failed to load remote module ',
        e,
        component.remoteEntryUrl,
        component.exposedModule
      );
      throw e;
    }
  }
}
