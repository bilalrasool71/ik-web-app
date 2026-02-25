import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { IkgsLoading } from '../services/ikgs-loading';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

export const apiCallInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(IkgsLoading);

  loadingService.setLoading(true, req.url);

  return next(req).pipe(
    finalize(() => {
      loadingService.setLoading(false, req.url);
    })
  );
};
