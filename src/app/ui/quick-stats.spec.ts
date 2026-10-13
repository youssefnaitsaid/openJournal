import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { QuickStats, type QuickStat } from './quick-stats';

@Component({
  imports: [QuickStats],
  selector: 'app-quick-stats-host',
  template: `<app-quick-stats [stats]="stats" />`,
})
class QuickStatsHost {
  stats: QuickStat[] = [
    { icon: 'lucidePercent', label: 'Trade win %', value: '50.00' },
    { icon: 'lucideHash', label: 'Total trades', value: '2', info: 'All time' },
  ];
}

describe('QuickStats', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders every stat label with its value', async () => {
    const fixture = TestBed.createComponent(QuickStatsHost);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Trade win %');
    expect(compiled.textContent).toContain('50.00');
    expect(compiled.textContent).toContain('Total trades');
    expect(compiled.textContent).toContain('2');
    expect(compiled.textContent).toContain('All time');
  });
});
