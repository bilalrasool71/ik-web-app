import { HttpInterceptorFn } from '@angular/common/http';
import { IkgsShared } from '../services/ikgs-shared';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { LocalStorageEnum } from '../enums/storage.enum';

export const headerEmbedInterceptor: HttpInterceptorFn = (req, next) => {
  let router = inject(Router);
  let sharedService = inject(IkgsShared);
  const token = localStorage.getItem(LocalStorageEnum.TokenInfo);
  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    return next(clonedRequest).pipe(
      map(event => {
        return event;
      })
    );
  }
  else {
    router.navigateByUrl("/");
    return next(req);
  }

};
