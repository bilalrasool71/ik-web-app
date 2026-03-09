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
            },
            {
                path: 'style-configuration',
                loadComponent: () => import('./features/ikgs-style-configuration/ikgs-style-configuration').then(x => x.IkgsStyleConfiguration)
            },
            {
                path: 'style-configuration/new',
                loadComponent: () => import('./features/ikgs-style-configuration/ikgs-style-configuration-form').then(x => x.IkgsStyleConfigurationForm)
            },
            {
                path: 'work-order',
                loadComponent: () => import('./features/ikgs-work-order/ikgs-work-order').then(x => x.IkgsWorkOrder)
            },
            {
                path: 'work-order/new',
                loadComponent: () => import('./features/ikgs-work-order/ikgs-work-order-form').then(x => x.IkgsWorkOrderForm)
            },
            {
                path: 'work-order/edit/:woNo',
                loadComponent: () => import('./features/ikgs-work-order/ikgs-work-order-form').then(x => x.IkgsWorkOrderForm)
            }
        ]
    }
];

