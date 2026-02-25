import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {

  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      let errorMessage = 'Unexpected error occurred';

      if (error.status === 0) {
        errorMessage = 'Server not reachable. Please check your connection.';
      }
      else if (error.status === 400) {
        errorMessage = error.error?.message || 'Bad request.';
      }
      else if (error.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      }
      else if (error.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      }
      else if (error.status === 404) {
        errorMessage = 'Requested resource not found.';
      }
      else if (error.status === 500) {
        errorMessage = 'Internal server error.';
      }
      else if (error.status === 504) {
        errorMessage = 'Server timeout. Please try again.';
      }

      messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage
      });
      return throwError(() => error);
    })
  );
};