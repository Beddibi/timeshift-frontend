import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  // Clone request with auth token if available
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only redirect to login on 401 if NOT already on the login page/auth endpoints
      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/mobile-login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const isMobile = router.url.includes('/mobile') || window.location.href.includes('/mobile');
        
        if (isMobile) {
          router.navigate(['/mobile/login']);
        } else {
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
