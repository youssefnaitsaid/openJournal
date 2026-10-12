import { Routes } from '@angular/router';

import { Dashboard } from './features/dashboard/dashboard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: Dashboard, title: 'Dashboard' },
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
  { path: '**', redirectTo: 'dashboard' },
];
