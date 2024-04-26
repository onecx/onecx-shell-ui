import { loadRemoteModule } from '@angular-architects/module-federation';
import { Injectable, Type } from '@angular/core';
import {
  SlotComponentConfiguration,
  SlotService,
} from '@onecx/angular-remote-components';
import { RemoteComponentsTopic } from '@onecx/integration-interface';
import { PermissionsCacheService } from '@onecx/shell-core';
import { Observable, firstValueFrom, map, shareReplay } from 'rxjs';
import { PermissionBffService, RemoteComponent, Slot } from '../generated';

@Injectable()
export class ShellSlotService implements SlotService {
  remoteComponents$ = new RemoteComponentsTopic();
  slotMappings: Slot[] | undefined;

  constructor(
    private permissionsService: PermissionBffService,
    private permissionsCacheService: PermissionsCacheService
  ) {}

  async init(): Promise<void> {
    return Promise.resolve();
  }

  getComponentsForSlot(
    slotName: string
  ): Observable<SlotComponentConfiguration[]> {
    return this.remoteComponents$.pipe(
      map((remoteComponents) =>
        (
          this.slotMappings?.find(
            (slotMapping) => slotMapping.name === slotName
          )?.components ?? []
        )
          .map((remoteComponentName) =>
            remoteComponents.find((rc) => rc.name === remoteComponentName)
          )
          .filter(
            (remoteComponent): remoteComponent is RemoteComponent =>
              !!remoteComponent
          )
          .map((remoteComponent) => remoteComponent)
      ),
      map((infos) =>
        infos.map((remoteComponent) => ({
          componentType: this.loadComponent(remoteComponent),
          remoteComponent,
          permissions: firstValueFrom(
            this.permissionsCacheService.getPermissions(
              remoteComponent.appId,
              remoteComponent.productName,
              (appId, productName) =>
                this.permissionsService
                  .getPermissions({ appId, productName })
                  .pipe(map(({ permissions }) => permissions))
            )
          ),
        }))
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
