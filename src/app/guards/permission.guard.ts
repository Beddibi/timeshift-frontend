import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const permissionGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If the user is a superadmin, allow all access automatically
  if (authService.hasPermission('*')) {
    return true;
  }

  const requiredPermissions = route.data?.['permissions'] as string[];
  
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true; // No permissions mandated
  }

  // Check if user has AT LEAST ONE of the required string permissions (e.g. VIEW_PLANNING OR MANAGE_PLANNING)
  const hasPermission = requiredPermissions.some(p => authService.hasPermission(p));
  
  if (hasPermission) {
    return true;
  }

  // Not authorized
  console.warn(`Access denied. Missing one of: ${requiredPermissions.join(', ')}`);
  router.navigate(['/dashboard']);
  return false;
};
