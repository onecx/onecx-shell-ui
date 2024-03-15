import { loadRemoteModule } from '@angular-architects/module-federation';
import { Injectable, Type } from '@angular/core';
import { BehaviorSubject, Observable, from, map, retry, of } from 'rxjs';
import { SlotService } from '@onecx/shell-core';
import { RemoteComponentsTopic } from '@onecx/integration-interface';
import { ComponentsBffService, RemoteComponentMapping } from '../generated';

@Injectable()
export class ShellSlotService implements SlotService {
  
  remoteComponents = new RemoteComponentsTopic();
  remoteComponentMappings: RemoteComponentMapping[] | undefined

  private slots$ = new BehaviorSubject<
    Record<string, Observable<Type<unknown>[]>>
  >({});

  constructor(private componentService: ComponentsBffService) {}

  async init(): Promise<void> {
    this.componentService
      .getComponentsByUrl(window.location.href)
      .pipe(
        retry(1),
        map(({ slotComponents }) => {
          return Object.keys(slotComponents).reduce((acc, slotName) => {
            const observable = from(
              Promise.all(
                slotComponents[slotName].map((component) => {
                  return this.loadComponent(component);
                })
              )
            );
            return { ...acc, [slotName]: observable };
          }, {} as Record<string, Observable<Type<unknown>[]>>);
        })
      )
      .subscribe(this.slots$);
  }

  getComponentsForSlot(slotName: string): Observable<Type<unknown>[]> {
    if (slotName === 'menu') {
      return from(
        this.loadComponent({
          remoteEntry: 'http://localhost:4400/core/portal-mgmt/remoteEntry.js',
          exposedModule: 'MenuComponent',
        }).then((c) => [c])
      );
      // return this.slots$.pipe(mergeMap((slots) => slots[slotName] ?? of([])));
    }
    return of([]);
  }

  private async loadComponent(component: {
    remoteEntry: string;
    exposedModule: string;
  }): Promise<Type<unknown>> {
    try {
      const m = await loadRemoteModule({
        type: 'module',
        remoteEntry: component.remoteEntry,
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
