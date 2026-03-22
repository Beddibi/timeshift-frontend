import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Not logged in so redirect to appropriate login page
  if (state.url.includes('/mobile')) {
    router.navigate(['/mobile/login']);
  } else {
    router.navigate(['/login']);
  }
  return false;
};
