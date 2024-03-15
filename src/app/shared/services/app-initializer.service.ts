import { Injectable } from '@angular/core';
import { ThemeService, UserService } from '@onecx/portal-integration-angular';
import { firstValueFrom } from 'rxjs';
import { UserBffService, WorkspaceConfigBffService } from '../generated';
import { RoutesService } from './routes.service';

@Injectable({ providedIn: 'root' })
export class AppInitializerService {
  constructor(
    private workspaceConfigBffService: WorkspaceConfigBffService,
    private userProfileBffService: UserBffService,
    private routesService: RoutesService,
    private themeService: ThemeService,
    private userService: UserService
  ) {}

  async init(): Promise<unknown> {
    const getWorkspaceConfigResponse = await firstValueFrom(
      this.workspaceConfigBffService.getWorkspaceConfig(window.location.href)
    );

    const getUserProfileResponse = await firstValueFrom(
      this.userProfileBffService.getUserProfile(window.location.href)
    );

    this.routesService.init(getWorkspaceConfigResponse.routes);
    this.themeService.apply(getWorkspaceConfigResponse.theme);
    await this.userService.profile$.publish(getUserProfileResponse.userProfile);

    return Promise.resolve();
  }
}
