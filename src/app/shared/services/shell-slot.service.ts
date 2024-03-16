import { loadRemoteModule } from '@angular-architects/module-federation';
import { Injectable, Type } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  from,
  map,
  retry,
  of,
  mergeMap,
} from 'rxjs';
import { SlotService } from '@onecx/shell-core';
import { RemoteComponentsTopic } from '@onecx/integration-interface';
import {
  ComponentsBffService,
  RemoteComponent,
  RemoteComponentMapping,
} from '../generated';

@Injectable()
export class ShellSlotService implements SlotService {
  remoteComponents = new RemoteComponentsTopic();
  remoteComponentMappings: RemoteComponentMapping[] | undefined;

  private slots$ = new BehaviorSubject<
    Record<string, Observable<Type<unknown>[]>>
  >({});

  constructor(private componentService: ComponentsBffService) {}

  async init(): Promise<void> {
    // this.componentService
    //   .getComponentsByUrl(window.location.href)
    //   .pipe(
    //     retry(1),
    //     map(({ slotComponents }) => {
    //       return Object.keys(slotComponents).reduce((acc, slotName) => {
    //         const observable = from(
    //           Promise.all(
    //             slotComponents[slotName].map((component) => {
    //               return this.loadComponent(component);
    //             })
    //           )
    //         );
    //         return { ...acc, [slotName]: observable };
    //       }, {} as Record<string, Observable<Type<unknown>[]>>);
    //     })
    //   )
    //   .subscribe(this.slots$);
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
