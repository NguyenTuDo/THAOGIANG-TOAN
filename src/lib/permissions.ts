import { RolePermissions, UserRole } from '../types';

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  guest: {
    canBrowseDestinations: true,
    canRunAlgorithms: true,
    canUsePresetRoutes: true,
    canAccessAdminPanel: false,
    canManageLocations: false,
    canManageRoutes: false,
    canManagePresets: false,
  },
  admin: {
    canBrowseDestinations: true,
    canRunAlgorithms: true,
    canUsePresetRoutes: true,
    canAccessAdminPanel: true,
    canManageLocations: true,
    canManageRoutes: true,
    canManagePresets: true,
  },
};
