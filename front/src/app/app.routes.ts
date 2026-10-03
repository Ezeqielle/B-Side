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
        path: 'stats',
        loadComponent: () => import('./features/stats/stats-page').then((m) => m.StatsPage),
      },
      {
        path: 'playlists',
        loadComponent: () =>
          import('./features/playlists/playlists-page').then((m) => m.PlaylistsPage),
      },
      {
        path: 'playlists/:id',
        loadComponent: () =>
          import('./features/playlists/playlist-page').then((m) => m.PlaylistPage),
      },
      {
        path: 'playlists/:id/doublons',
        loadComponent: () =>
          import('./features/playlists/duplicates-page').then((m) => m.DuplicatesPage),
      },
      {
        path: 'playlists/:id/a-garder',
        loadComponent: () => import('./features/playlists/kept-page').then((m) => m.KeptPage),
      },
      {
        path: 'journal',
        loadComponent: () => import('./features/journal/journal-page').then((m) => m.JournalPage),
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
