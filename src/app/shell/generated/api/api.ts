export * from './permission.service';
import { PermissionBffService } from './permission.service';
export * from './userProfile.service';
import { UserProfileBffService } from './userProfile.service';
export * from './workspaceConfig.service';
import { WorkspaceConfigBffService } from './workspaceConfig.service';
export const APIS = [
  PermissionBffService,
  UserProfileBffService,
  WorkspaceConfigBffService,
];
