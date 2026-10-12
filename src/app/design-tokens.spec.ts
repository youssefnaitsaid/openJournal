/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

const templates = import.meta.glob('./**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const BANNED_PALETTE =
  /#[0-9a-fA-F]{3,8}|rgb\(|oklch\(|bg-(red|green|blue|white|black)-|text-(red|green|blue|white|black)-|\[#[0-9a-fA-F]+\]/;

describe('design tokens', () => {
  it('uses theme tokens, no hard-coded palette in templates', () => {
    const offenders = Object.entries(templates)
      .filter(([, source]) => BANNED_PALETTE.test(source as string))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
