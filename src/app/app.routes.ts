import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./auth/components/ikgs-login/ikgs-login').then(x=>x.IkgsLogin)
    }
];

