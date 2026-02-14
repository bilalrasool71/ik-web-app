import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('./auth/components/ikgs-login/ikgs-login').then(x => x.IkgsLogin)
    },
    {
        path: 'ikgs',
        loadComponent: () => import('./core/layout/ikgs-main-layout/ikgs-main-layout').then(x => x.IkgsMainLayout),
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./features/ikgs-dashboard/ikgs-dashboard').then(x => x.IkgsDashboard)
            }
        ]
    }
];

