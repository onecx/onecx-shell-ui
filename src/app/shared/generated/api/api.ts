export * from './components.service';
import { ComponentsBffService } from './components.service';
export * from './user.service';
import { UserBffService } from './user.service';
export * from './workspaceConfig.service';
import { WorkspaceConfigBffService } from './workspaceConfig.service';
export const APIS = [ComponentsBffService, UserBffService, WorkspaceConfigBffService];
