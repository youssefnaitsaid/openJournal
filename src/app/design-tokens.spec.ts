/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

const templates = import.meta.glob('./**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const HUES = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'white',
  'black',
];

const HUE_PATTERN = HUES.join('|');

const BANNED_PALETTE = new RegExp(
  `#[0-9a-fA-F]{3,8}|rgb\\(|oklch\\(|bg-(${HUE_PATTERN})-|text-(${HUE_PATTERN})-|\\[#[0-9a-fA-F]+\\]`,
);

// The shadow semantic-token layer deleted from src/styles.css in #39. Any
// template still naming one of these is reaching for a token that no longer
// exists: the class resolves to nothing and light/dark coherence is lost.
const SHADOW_TOKENS = [
  'text-muted-foreground',
  'text-muted',
  'bg-muted',
  'text-foreground',
  'bg-background',
  'bg-card',
  'text-card-foreground',
  'bg-popover',
  'text-popover-foreground',
  'bg-primary',
  'text-primary-foreground',
  'bg-secondary',
  'text-secondary',
  'text-secondary-foreground',
  'bg-accent',
  'text-accent',
  'text-accent-foreground',
  'text-destructive',
  'bg-destructive',
  'text-destructive-foreground',
  'text-success',
  'text-warning',
  'border-border',
  'border-input',
  'bg-input',
  'outline-ring',
  'bg-sidebar',
  'text-sidebar',
  'border-sidebar',
  'ring-sidebar',
  'sidebar-accent',
];

const RETIRED_SHADOW_TOKENS = new RegExp(
  `${SHADOW_TOKENS.join('|')}|--(?:background|foreground|card|popover|muted|accent|destructive|success|warning|border|input|ring|sidebar|primary|secondary|chart)[\\w-]*\\s*:|var\\(--(?:background|foreground|card|popover|muted|accent|destructive|success|warning|border|input|ring|sidebar|primary|secondary|chart|ease-out)[\\w-]*\\)`,
);

// The kicker/eyebrow heading idiom: an uppercase, wide-tracked label parked
// above a heading. Wide tracking starts at 0.2em; the sidebar group labels at
// 0.18em stay allowed. The retired `eyebrow` component API is caught in every
// binding form: input `[eyebrow]=`, event/two-way `(eyebrow)=`, style `eyebrow:`,
// plus the `eyebrow()` signal read and `eyebrow=`/`eyebrow(` plain forms.
const KICKER_HEADING =
  /tracking-\[(?:0\.[2-9]\d*|[1-9]\d*(?:\.\d+)?)(?:e-?\d+)?em\]|\[\(?eyebrow\)?\]?\s*=|\(eyebrow\)\s*=|(?<![a-zA-Z-])eyebrow\s*[:(]/;

const RETIRED_MOTION = /animate-fade-in-up|animation:\s*oj-fade-in-up/
;

// Bespoke per-element styling: the loophole that lets a template bypass the
// Aura token contract. `[class.x]="…"` conditional classes stay legal.
const BESPOKE_STYLE =
  /\bstyle\s*=|styleClass\s*=|\[(?:style|styleClass|class|ngStyle)\]\s*=/;

// The stat-strip tile component deleted in #35; its selector must never return.
const DELETED_STAT_STRIP = /app-quick-stats|appQuickStats/;

// App-authored icons are @ng-icons/lucide. PrimeIcons survive only inside
// PrimeNG's own internals (sort icons, datepicker trigger), never in a template.
const APP_AUTHORED_PRIMEICONS = /\bpi pi-[a-z0-9-]+/;

// The highlight pairing (DESIGN.md → Token contract): the light-theme Aura
// highlight background is near-black, so every `bg-highlight` surface must
// carry `text-highlight` from the same token pair. Checked per element tag:
// a `bg-highlight` with no `text-highlight` before the closing `>` is
// unpaired, whether static, in `routerLinkActive`, or beside a
// `[class.bg-highlight]` binding.
function unpairedHighlightPaths(sources: Record<string, string>): string[] {
  return Object.entries(sources)
    .filter(([, source]) =>
      /<[^>]*bg-highlight[^>]*>/.test(source) &&
      [...source.matchAll(/<[^>]*bg-highlight[^>]*>/g)].some((m) => !m[0].includes('text-highlight')),
    )
    .map(([path]) => path);
}

const BANNED_SLOP =
  /bg-gradient-hero|bg-gradient-header|rounded-\[28px\]|rounded-\[24px\]|hover-lift|animate-count-up|stagger-[1-6]/;

interface TokenRule {
  readonly name: string;
  readonly pattern: RegExp;
}

const RULES: readonly TokenRule[] = [
  { name: 'hard-coded palette colors', pattern: BANNED_PALETTE },
  { name: 'retired shadow semantic tokens', pattern: RETIRED_SHADOW_TOKENS },
  { name: 'kicker / eyebrow heading idioms', pattern: KICKER_HEADING },
  { name: 'the retired fade-in-up motion', pattern: RETIRED_MOTION },
  { name: 'bespoke style and styleClass overrides', pattern: BESPOKE_STYLE },
  { name: 'the deleted quick-stats stat-strip tiles', pattern: DELETED_STAT_STRIP },
  { name: 'app-authored PrimeIcons', pattern: APP_AUTHORED_PRIMEICONS },
  { name: 'the retired SaaS template idioms', pattern: BANNED_SLOP },
];

function offendingPaths(pattern: RegExp, sources: Record<string, string>): string[] {
  return Object.entries(sources)
    .filter(([, source]) => pattern.test(source))
    .map(([path]) => path);
}

function liveTemplatePaths(pattern: RegExp): string[] {
  return offendingPaths(pattern, templates);
}

const RETIRED_FIXTURES: Record<string, string> = {
  'hard-coded palette colors':
    '<section class="bg-zinc-50 text-red-600 border-b-[#0f0f0f] rgb(1 2 3)"></section>',
  'retired shadow semantic tokens':
    '<p class="text-xs text-muted-foreground"><h1 class="text-foreground">T</h1><span class="text-destructive">e</span><span class="text-success">g</span><div class="bg-sidebar-accent"></div><i style="color: var(--muted-foreground)"></i></p>',
  'kicker / eyebrow heading idioms':
    '<app-page-hero [eyebrow]="Overview"></app-page-hero><p class="text-xs font-semibold uppercase tracking-[0.24em]">{{ eyebrow() }}</p>',
  'the retired fade-in-up motion': '<div class="animate-fade-in-up"></div>',
  'bespoke style and styleClass overrides':
    '<p-button styleClass="mt-6" [styleClass]="wide" [style]="w: 1" style="margin: 0"></p-button>',
  'the deleted quick-stats stat-strip tiles': '<app-quick-stats [items]="rows()" />',
  'app-authored PrimeIcons': '<p-button icon="pi pi-download" />',
  'the retired SaaS template idioms':
    '<div class="bg-gradient-hero rounded-[28px] hover-lift animate-count-up stagger-3"></div>',
};

// The replacement idiom established by #35-#38: it must pass every rule.
const ACCEPTED_FIXTURE = `
<app-page-hero title="Trades" subtitle="Every Trade in one place" icon="lucideArrowDownUp" />
<p class="mt-1 text-sm text-surface-600 dark:text-surface-300">Secondary copy</p>
<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Trades</h1>
<td><p-tag [value]="'' + trade.net" [severity]="trade.net >= 0 ? 'success' : 'danger'" /></td>
<p-message severity="error">{{ portfolioError() }}</p-message>
<td [class.bg-highlight]="selectedDay() === cell.date" [class.text-highlight]="selectedDay() === cell.date">
  <p-button type="button" ariaLabel="Export CSV" severity="secondary">
    <ng-template pTemplate="icon"><ng-icon name="lucideDownload" /></ng-template>
  </p-button>
</td>
<p class="px-3 pb-1 text-xs font-medium uppercase tracking-[0.18em] opacity-60">Overview</p>
<a routerLink="/dashboard" routerLinkActive="bg-highlight text-highlight" class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-800">Dashboard</a>
<p-drawer [(visible)]="sidebarOpen" position="left" header="openJournal"><aside class="w-80"></aside></p-drawer>
`;

describe('design tokens', () => {
  it('has a failing fixture for every guard rule', () => {
    const guarded = Object.keys(RETIRED_FIXTURES).sort();
    expect(guarded).toEqual(RULES.map((rule) => rule.name).sort());
  });

  it('catches the retired eyebrow input-binding form [eyebrow]="x"', () => {
    const fixture = { './retired-fixture.html': '<app-page-hero [eyebrow]="x" />' };
    expect(offendingPaths(KICKER_HEADING, fixture)).toEqual(['./retired-fixture.html']);
    const twoWayForm = { './retired-fixture.html': '<app-page-hero [(eyebrow)]="x" />' };
    expect(offendingPaths(KICKER_HEADING, twoWayForm)).toEqual(['./retired-fixture.html']);
    const eventForm = { './retired-fixture.html': '<app-page-hero (eyebrow)="go()" />' };
    expect(offendingPaths(KICKER_HEADING, eventForm)).toEqual(['./retired-fixture.html']);
    const styleForm = { './retired-fixture.html': '.title { eyebrow: 1; }' };
    expect(offendingPaths(KICKER_HEADING, styleForm)).toEqual(['./retired-fixture.html']);
  });

  it('fails on a bg-highlight surface with no text-highlight pair', () => {
    expect(unpairedHighlightPaths({ './x.html': '<a routerLinkActive="bg-highlight">' })).toEqual(['./x.html']);
    expect(unpairedHighlightPaths({ './x.html': '<td [class.bg-highlight]="sel()">' })).toEqual(['./x.html']);
    expect(unpairedHighlightPaths({ './x.html': '<span class="bg-highlight font-semibold">' })).toEqual(['./x.html']);
    expect(unpairedHighlightPaths({ './x.html': '<a routerLinkActive="bg-highlight text-highlight">' })).toEqual([]);
    expect(unpairedHighlightPaths({ './x.html': '<td [class.bg-highlight]="sel()" [class.text-highlight]="sel()">' })).toEqual([]);
    expect(unpairedHighlightPaths({ './x.html': '<span class="bg-highlight text-highlight">' })).toEqual([]);
  });

  it('pairs every bg-highlight with text-highlight in any template', () => {
    expect(unpairedHighlightPaths(templates)).toEqual([]);
  });

  for (const rule of RULES) {
    it(`fails on the retired ${rule.name} idiom`, () => {
      const fixture = { './retired-fixture.html': RETIRED_FIXTURES[rule.name] };
      expect(offendingPaths(rule.pattern, fixture)).toEqual(['./retired-fixture.html']);
    });

    it(`accepts the Aura replacement idiom for ${rule.name}`, () => {
      const fixture = { './accepted-fixture.html': ACCEPTED_FIXTURE };
      expect(offendingPaths(rule.pattern, fixture)).toEqual([]);
    });

    it(`uses no ${rule.name} in any template`, () => {
      expect(liveTemplatePaths(rule.pattern)).toEqual([]);
    });
  }
});
