import { TestBed } from '@angular/core/testing';
import { ImageService } from './image.service';
import { ThemeService } from '@onecx/angular-integration-interface';
import { WorkspaceConfigBffService } from 'src/app/shared/generated';
import { firstValueFrom, of } from 'rxjs'
import { FakeTopic } from '@onecx/accelerator';
import { CurrentThemeTopic } from '@onecx/integration-interface';

const THEME_SERVICE_MOCK = {
      currentTheme$: new FakeTopic<CurrentThemeTopic>(),
}

const THEME_CONFIG = {
    name: 'dark'
}

describe('ImageService', () => {
  let service: ImageService;
  let themeService: ThemeService;
  let workspaceConfigBffService: WorkspaceConfigBffService;
  let imageTopicMock: FakeTopic<{ images: { [key: string]: string } }>;

    
  beforeEach(() => {
    TestBed.configureTestingModule({
          providers: [
            ImageService,
            { provide: ThemeService, useValue: THEME_SERVICE_MOCK },
            { provide: WorkspaceConfigBffService, useValue: { getAvailableImageTypes: jest.fn(), getThemeImageByNameAndRefType: jest.fn() } }
          ]
        })
    service = TestBed.inject(ImageService);
    themeService = TestBed.inject(ThemeService);
    workspaceConfigBffService = TestBed.inject(WorkspaceConfigBffService);
    imageTopicMock = new FakeTopic<{ images: { [key: string]: string } }>();
    (service as any).imageInterface.imageTopic = imageTopicMock;
    themeService.currentTheme$.publish(THEME_CONFIG);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('Should publish images when theme and image types are available', async () => {
    const expectedKeys = ["logo", "previewIcon"];
    themeService.currentTheme$.publish(THEME_CONFIG);    
    const availableImagesSpy = jest.spyOn(workspaceConfigBffService, 'getAvailableImageTypes').mockReturnValue(of({ types: expectedKeys } as any));
    const imageByNameAndRefType = jest.spyOn(workspaceConfigBffService, 'getThemeImageByNameAndRefType').mockImplementation((themeName: string, type: string) => {
      const blob = new Blob(['fake image data'], { type: 'image/png' });
      return of(blob) as any;
    });

    await service['init']();
    const imagePaths = await firstValueFrom(imageTopicMock.asObservable())
    
    expect(availableImagesSpy).toHaveBeenCalledWith('dark');
    expect(imageByNameAndRefType).toHaveBeenCalledTimes(2);
    expect(imageByNameAndRefType).toHaveBeenCalledWith('dark', 'logo');
    expect(imageByNameAndRefType).toHaveBeenCalledWith('dark', 'previewIcon');
    expect(Object.keys(imagePaths.images)).toEqual(expectedKeys);
  });

  it('should publish empty images if getAvailableImageTypes throws an error', async () => {
    jest.spyOn(workspaceConfigBffService, 'getAvailableImageTypes').mockImplementation(() => { throw new Error('fail'); });
    const publishSpy = jest.spyOn(service['imageInterface'].imageTopic, 'publish');

    await service['init']();

    expect(publishSpy).toHaveBeenCalledWith({ images: {} });
    });

  it('should not publish if theme name is missing, or if available types are empty or undefined', async () => {
    const publishSpy = jest.spyOn(service['imageInterface'].imageTopic, 'publish');

    themeService.currentTheme$.publish({});
    await service['init']();
    expect(publishSpy).not.toHaveBeenCalled();

    themeService.currentTheme$.publish(THEME_CONFIG);
    jest.spyOn(workspaceConfigBffService, 'getAvailableImageTypes').mockReturnValue(of(undefined as any));
    await service['init']();
    expect(publishSpy).not.toHaveBeenCalled();

    jest.spyOn(workspaceConfigBffService, 'getAvailableImageTypes').mockReturnValue(of({ types: [] as any } as any));
    await service['init']();
    expect(publishSpy).not.toHaveBeenCalled();

    jest.spyOn(workspaceConfigBffService, 'getAvailableImageTypes').mockReturnValue(of({} as any));
    await service['init']();
    expect(publishSpy).not.toHaveBeenCalled();
  });
});
