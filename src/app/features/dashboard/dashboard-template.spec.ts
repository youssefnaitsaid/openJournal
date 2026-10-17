/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

// Dashboard-only contract guard for ticket #35: the "Where do I stand right
// now?" template must live on the PrimeNG Aura surface/primary scale and must
// never revive the retired shadow-semantic / kicker idioms. Scoped to the
// dashboard folder so it can't be satisfied by editing global styles.
const sources = Object.values(
  import.meta.glob('./*.{html,css}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
).map((source) => source as string);

const allTemplates = sources.join('\n');

describe('dashboard template tokens', () => {
  it('carries no shadow semantic tokens (text-foreground / muted / sidebar-accent)', () => {
    const SHADOW_TOKENS =
      /text-foreground|text-muted-foreground|bg-muted|border-(?:foreground|muted)|--sidebar-accent|--muted-foreground|--foreground/;
    expect(allTemplates).not.toMatch(SHADOW_TOKENS);
  });

  it('never revives the retired kicker / eyebrow idiom', () => {
    const KICKER_IDIOM = /tracking-\[0\.24em\]|animate-fade-in-up|eyebrow/;
    expect(allTemplates).not.toMatch(KICKER_IDIOM);
  });

  it('expresses metrics on the Aura surface/primary scale, not a hard-coded palette', () => {
    // Reuse the app-wide banned palette contract locally so the band/hero stay
    // on theme tokens (surface/primary) rather than raw hues or hex.
    const HARD_CODED =
      /#[0-9a-fA-F]{3,8}|rgb\(|oklch\(|bg-(?:slate|zinc|gray|red|blue)-|text-(?:slate|zinc|gray)-/;
    expect(allTemplates).not.toMatch(HARD_CODED);
  });

  it('renders its numbers with tabular numerals for the KPI band', () => {
    expect(allTemplates).toMatch(/tabular-nums/);
  });
});
