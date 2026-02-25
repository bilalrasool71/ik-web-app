import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';

import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { headerEmbedInterceptor } from './core/interceptors/header-embed-interceptor';
import { CookieService } from 'ngx-cookie-service';
import { DatePipe } from '@angular/common';
import { apiCallInterceptor } from './core/interceptors/api-call-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([headerEmbedInterceptor, apiCallInterceptor, errorInterceptor])),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: 'none'
        }
      }
    }),
    MessageService,
    CookieService,
    { provide: DatePipe, useClass: DatePipe },
  ]
};
