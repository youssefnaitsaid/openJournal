/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

const templates = import.meta.glob('./**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

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

describe('design tokens', () => {
  it('uses theme tokens, no hard-coded palette in templates', () => {
    const offenders = Object.entries(templates)
      .filter(([, source]) => BANNED_PALETTE.test(source as string))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it('keeps styling in the theme, no inline style attributes in templates', () => {
    const offenders = Object.entries(templates)
      .filter(([, source]) => /style\s*=/.test(source as string))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
