import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'top' },
      {
        path: 'top',
        loadComponent: () =>
          import('./features/top-tracks/top-tracks-page').then((m) => m.TopTracksPage),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/history/history-page').then((m) => m.HistoryPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
