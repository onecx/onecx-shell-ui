import { loadRemoteModule } from '@angular-architects/module-federation';
import { Injectable, Type } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  ReplaySubject,
  from,
  map,
  mergeMap,
  of,
  retry,
} from 'rxjs';
import { SlotService } from '@onecx/shell-core';
import { ComponentsBffService } from '../generated';

@Injectable()
export class ShellSlotService implements SlotService {
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
            const observable = from(Promise.all(slotComponents[slotName].map((component) => {
                return this.loadComponent(component)
            })))
            return { ...acc, [slotName]: observable };
          }, {} as Record<string, Observable<Type<unknown>[]>>);
        })
      )
      .subscribe(this.slots$);
  }

  getComponentsForSlot(slotName: string): Observable<Type<unknown>[]> {
    return this.slots$.pipe(mergeMap((slots) => slots[slotName] ?? of([])));
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
