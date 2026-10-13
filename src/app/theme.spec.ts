import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeService } from './theme';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.configureTestingModule({});
  });

  it('reads the persisted choice on startup', () => {
    localStorage.setItem('openjournal-theme-dark', '1');
    const service = TestBed.inject(ThemeService);
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles dark mode and persists the choice', () => {
    localStorage.setItem('openjournal-theme-dark', '0');
    const service = TestBed.inject(ThemeService);
    expect(service.isDark()).toBe(false);
    service.toggleDarkMode();
    expect(service.isDark()).toBe(true);
    expect(localStorage.getItem('openjournal-theme-dark')).toBe('1');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    service.toggleDarkMode();
    expect(service.isDark()).toBe(false);
    expect(localStorage.getItem('openjournal-theme-dark')).toBe('0');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
