import { loadRemoteModule } from '@angular-architects/module-federation';
import { Injectable, Type } from '@angular/core';
import {
  RemoteComponentInfo,
  SlotService
} from '@onecx/angular-remote-components';
import { RemoteComponentsTopic } from '@onecx/integration-interface';
import { PermissionsCacheService } from '@onecx/shell-core';
import { from, map, mergeMap, Observable, shareReplay, zip } from 'rxjs';
import {
  PermissionBffService,
  RemoteComponent,
  RemoteComponentMapping
} from '../generated';

@Injectable()
export class ShellSlotService implements SlotService {
  remoteComponents$ = new RemoteComponentsTopic();
  remoteComponentMappings: RemoteComponentMapping[] | undefined;

  constructor(
    private permissionsService: PermissionBffService,
    private permissionsCacheService: PermissionsCacheService
  ) {}

  async init(): Promise<void> {
    return Promise.resolve();
  }

  getComponentsForSlot(slotName: string): Observable<
    {
      componentType: Type<unknown> | undefined;
      remoteComponent: RemoteComponentInfo;
      permissions: string[];
    }[]
  > {
    return this.remoteComponents$.pipe(
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
                  this.permissionsService
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
      ),
      shareReplay()
    );
  }

  private async loadComponent(component: {
    remoteEntryUrl: string;
    exposedModule: string;
  }): Promise<Type<unknown> | undefined> {
    try {
      const exposedModule = component.exposedModule.startsWith('./')
        ? component.exposedModule.slice(2)
        : component.exposedModule;
      const m = await loadRemoteModule({
        type: 'module',
        remoteEntry: component.remoteEntryUrl,
        exposedModule: './' + exposedModule,
      });
      return m[exposedModule];
    } catch (e) {
      console.log(
        'Failed to load remote module ',
        component.exposedModule,
        component.remoteEntryUrl,
        e
      );
      return undefined;
    }
  }
}
