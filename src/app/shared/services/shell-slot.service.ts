import { loadRemoteModule } from '@angular-architects/module-federation';
import { Injectable, Type } from '@angular/core';
import { RemoteComponentsTopic } from '@onecx/integration-interface';
import { SlotService } from '@onecx/angular-remote-components';
import { Observable, from, map, mergeMap } from 'rxjs';
import { RemoteComponent, RemoteComponentMapping } from '../generated';

@Injectable()
export class ShellSlotService implements SlotService {
  remoteComponents = new RemoteComponentsTopic();
  remoteComponentMappings: RemoteComponentMapping[] | undefined;

  async init(): Promise<void> {
    // not needed in this implementation
  }

  getComponentsForSlot(slotName: string): Observable<Type<unknown>[]> {
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
      mergeMap((rcs: RemoteComponent[]) =>
        from(Promise.all(rcs.map((rc) => this.loadComponent(rc))))
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
