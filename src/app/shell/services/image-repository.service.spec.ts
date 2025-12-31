import { TestBed } from '@angular/core/testing';
import { ThemeService } from '@onecx/angular-integration-interface';
import { WorkspaceConfigBffService } from 'src/app/shared/generated';
import { firstValueFrom, of, throwError } from 'rxjs'
import { FakeTopic } from '@onecx/accelerator';
import { CurrentThemeTopic } from '@onecx/integration-interface';
import { ImageRepositoryService } from './image-repository.service';

const THEME_SERVICE_MOCK = {
      currentTheme$: new FakeTopic<CurrentThemeTopic>(),
}
const THEME_NAME = 'dark';
const THEME_CONFIG = {
    name: THEME_NAME
}

describe('ImageRepositoryService', () => {
  let service: ImageRepositoryService;
  let themeService: ThemeService;
  let workspaceConfigBffService: WorkspaceConfigBffService;
  let imageTopicMock: FakeTopic<{ images: { [key: string]: string } }>;

    
  beforeEach(() => {
    TestBed.configureTestingModule({
          providers: [
            ImageRepositoryService,
            { provide: ThemeService, useValue: THEME_SERVICE_MOCK },
            { provide: WorkspaceConfigBffService, useValue: { getAvailableImageTypes: jest.fn(), getThemeImageByNameAndRefType: jest.fn() } }
          ]
        })
    service = TestBed.inject(ImageRepositoryService);
    themeService = TestBed.inject(ThemeService);
    workspaceConfigBffService = TestBed.inject(WorkspaceConfigBffService);
    imageTopicMock = new FakeTopic<{ images: { [key: string]: string } }>();
    (service as any).imageRepositoryInterface.imageRepositoryTopic = imageTopicMock;
    themeService.currentTheme$.publish(THEME_CONFIG);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('Should publish images when theme and image types are available', async () => {
    const expectedKeys = ["logo", "previewIcon"];
    themeService.currentTheme$.publish(THEME_CONFIG);
    jest.spyOn(workspaceConfigBffService, 'getAvailableImageTypes').mockReturnValue(of({ types: expectedKeys } as any));

    await service.init();
    const imagePaths = await firstValueFrom(imageTopicMock.asObservable());

    expect(Object.keys(imagePaths.images)).toEqual(expectedKeys);
    expect(imagePaths.images['logo']).toBe(`/workspaceConfig/themes/${THEME_CONFIG.name}/images/logo`);
    expect(imagePaths.images['previewIcon']).toBe(`/workspaceConfig/themes/${THEME_CONFIG.name}/images/previewIcon`);
  });

  describe('error scenarios', () => {

    it('should publish empty images if getAvailableImageTypes throws an error', async () => {
      jest.spyOn(workspaceConfigBffService, 'getAvailableImageTypes').mockReturnValue(throwError(() => new Error('fail')));
      await service.init();
      const imagePaths = await firstValueFrom(imageTopicMock.asObservable());
      expect(imagePaths).toEqual({ images: {} });
    });


    it('should log error and not publish if theme name is missing', async () => {
      const errorSpy = jest.spyOn(console, 'error');
      themeService.currentTheme$.publish({});

      await service.init();
      let emitted = false;      
      imageTopicMock.asObservable().subscribe(() => { emitted = true; });

      expect(emitted).toBe(false);
      expect(errorSpy).toHaveBeenCalled();
    });


    it('should publish empty images if available types are empty', async () => {
      themeService.currentTheme$.publish(THEME_CONFIG);
      jest.spyOn(workspaceConfigBffService, 'getAvailableImageTypes').mockReturnValue(of({ types: [] as any } as any));

      await service.init();
      const imagePaths = await firstValueFrom(imageTopicMock.asObservable());

      expect(imagePaths).toEqual({ images: {} });
    });


    it('should log error and not publish if available types are undefined (error in BFF)', async () => {
      const errorSpy = jest.spyOn(console, 'error');
      themeService.currentTheme$.publish(THEME_CONFIG);
      jest.spyOn(workspaceConfigBffService, 'getAvailableImageTypes').mockReturnValue(of(undefined as any));

      await service.init();
      const imagePaths = await firstValueFrom(imageTopicMock.asObservable());

      expect(imagePaths).toEqual({ images: {} });
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
