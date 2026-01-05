import { inject, Injectable } from '@angular/core';
import { ImageRepositoryService as ImageRepositoryInterface, ThemeService } from '@onecx/angular-integration-interface';
import { catchError, EMPTY, first, from, map, mergeMap } from 'rxjs';
import { WorkspaceConfigBffService } from 'src/app/shared/generated';

@Injectable({ providedIn: 'root' })
export class ImageRepositoryService {
    private readonly imageRepositoryInterface = inject(ImageRepositoryInterface)
    private readonly workspaceConfigBffService = inject(WorkspaceConfigBffService);
    private readonly themeService = inject(ThemeService)
    
    /**
     * Triggers image loading and publishing asynchronously.
     * Returns a resolved Promise<void> immediately (non-blocking).
    */

    public async init(): Promise<void> {
        this.getAvailableImages();
    }

    private getAvailableImages(): void{
        this.themeService.currentTheme$.pipe(
            first(),
            map(theme => theme.name || ''),
            mergeMap(themeName => {
                if (!themeName) {
                    console.error('Theme name is missing');
                    return from(EMPTY);
                }
                return this.workspaceConfigBffService.getAvailableImageTypes(themeName).pipe(
                    first(),
                    map(res => {
                        if (!res?.types || !Array.isArray(res.types)) {
                            throw new Error('No available image types');
                        }
                        const availableTypes = res.types as string[];
                        if (!availableTypes.length) {
                            return {};
                        }
                        const urls: { [key: string]: string } = {};
                        availableTypes.forEach(type => {
                            urls[type] = this.constructImagePath(themeName, type);
                        });
                        return urls;
                    })
                );
            }),
            catchError(err => {
                console.error("Error: " + err.message, err);
                return from([{}]);
            })
        ).subscribe({
            next: urls => {
                if (urls) {
                    this.imageRepositoryInterface.imageRepositoryTopic.publish({ images: { ...urls } });
                }
            }
        });
    }

    private constructImagePath(themeName: string, type: string): string {           
        return `/shell-bff/workspaceConfig/themes/${themeName}/images/${type}`;   
    }
}
