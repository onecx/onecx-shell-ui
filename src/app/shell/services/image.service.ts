import { inject, Injectable } from '@angular/core';
import { ImageService as ImageInterface, ThemeService } from '@onecx/angular-integration-interface';
import { catchError, filter, first, forkJoin, from, map, mergeMap } from 'rxjs';
import { readBlobAsDataURL } from '../utils/common.utils';
import { WorkspaceConfigBffService } from 'src/app/shared/generated';

@Injectable({ providedIn: 'root' })
export class ImageService {
    private readonly imageInterface = inject(ImageInterface)
    private readonly workspaceConfigBffService = inject(WorkspaceConfigBffService);
    private readonly themeService = inject(ThemeService)
    
    /**
     * Triggers image loading and publishing asynchronously.
     * Returns a resolved Promise<void> immediately (non-blocking).
     */

    public init(): void {
        this.getAvailableImages();
    }

    private getAvailableImages(): Promise<void> {
        this.themeService.currentTheme$.pipe(
            first(),
            map(theme => theme.name || null),
            filter((themeName): themeName is string => !!themeName),
            mergeMap(themeName =>
                this.workspaceConfigBffService.getAvailableImageTypes(themeName).pipe(
                    first(),
                    filter(res => !!res?.types?.length),
                    mergeMap(res => {                        
                        const availableTypes = res.types as string[];
                        const imageObservables = availableTypes.map(type => this.getImageUrl(themeName, type));
                        return forkJoin(imageObservables);
                    }),
                    map(results => {
                        console.log('Loaded images:', results);
                        const urls: { [key: string]: string } = {};
                        results.forEach(({ type, url }) => {
                            if (typeof url === 'string' && url) {
                                urls[type] = url;
                            }
                        });
                        return urls;
                    })
                )
            ),
            catchError(err => {
                console.error('Failed to load images', err);
                return from([{}]);
            })
        ).subscribe({
            next: urls => this.imageInterface.imageTopic.publish({ images: { ...urls } })
        });
        return Promise.resolve();
    }
    
    private getImageUrl(themeName: string, type: string) {
        return this.workspaceConfigBffService.getThemeImageByNameAndRefType(themeName, type).pipe(
            filter(blob => !!blob),
            mergeMap(blob => from(readBlobAsDataURL(blob))),
            map(url => ({ type, url }))
        );
    }
}
