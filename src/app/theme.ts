import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'openjournal-theme-dark';

function loadInitial(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === '1') return true;
  if (stored === '0') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(loadInitial());

  constructor() {
    this.apply(this.isDark());
  }

  toggleDarkMode(): void {
    const next = !this.isDark();
    this.isDark.set(next);
    this.apply(next);
  }

  private apply(dark: boolean): void {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(STORAGE_KEY, dark ? '1' : '0');
  }
}
