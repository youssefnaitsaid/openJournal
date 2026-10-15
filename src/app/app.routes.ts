import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.Dashboard),
    title: 'Dashboard',
  },
  {
    path: 'trades',
    loadComponent: () => import('./features/trades/trades').then((m) => m.Trades),
    title: 'Trades',
  },
  {
    path: 'journal',
    loadComponent: () => import('./features/journal/journal').then((m) => m.Journal),
    title: 'Journal',
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./features/analytics/analytics').then((m) => m.Analytics),
    title: 'Analytics',
  },
  { path: '**', redirectTo: 'dashboard' },
];
