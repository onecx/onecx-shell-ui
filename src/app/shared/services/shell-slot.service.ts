import { loadRemoteModule } from '@angular-architects/module-federation';
import { Injectable, Type } from '@angular/core';
import { RemoteComponentsTopic } from '@onecx/integration-interface';
import { SlotService } from '@onecx/angular-remote-components';
import { Observable, from, map, mergeMap, zip } from 'rxjs';
import {
  RemoteComponent,
  RemoteComponentMapping,
  UserBffService,
} from '../generated';
import { RemoteComponentInfo } from '@onecx/angular-remote-components';

@Injectable()
export class ShellSlotService implements SlotService {
  remoteComponents = new RemoteComponentsTopic();
  remoteComponentMappings: RemoteComponentMapping[] | undefined;

  constructor(private userService: UserBffService) {}

  async init(): Promise<void> {
    return Promise.resolve();
  }

  getComponentsForSlot(
    slotName: string
  ): Observable<
    { componentType: Type<unknown>; remoteComponent: RemoteComponentInfo, permissions: string[] }[]
  > {
    return this.remoteComponents.pipe(
      map((rcs) =>
        (
          this.remoteComponentMappings?.filter(
            (rcm) => rcm.slotName === slotName
          ) ?? []
        )
          .map((rcm) => rcs.find((rc) => rc.name === rcm.remoteComponent))
          .filter((rc) => !!rc)
          .map((rc) => rc as RemoteComponent)
      ),
      mergeMap((rcs: RemoteComponent[]) => {
        return zip(rcs.map((rc) =>
          this.userService
            .getPermissions(rc.appId, rc.productName)
            .pipe(map(({permissions}) => ({rc, permissions})))
        ));
      }),
      mergeMap((infos) =>
        from(
          Promise.all(
            infos.map(({rc, permissions}) =>
              this.loadComponent(rc).then((c) => ({
                componentType: c,
                remoteComponent: rc,
                permissions
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
      //TODO: verbessern
      console.log(e);
      throw e;
    }
  }
}
