# DESIGN.md — PrimeNG Aura canon with zinc token shell

Components render at PrimeNG Aura preset defaults: Card, Table
(sortable columns, paginator), Button, InputText, InputNumber,
Checkbox, Message, Select. No per-component visual overrides, no
custom palette, no custom motion on components.

The zinc token layer (`src/styles.css`, light + `:root.dark`
variants) remains for three jobs only:

- shell surfaces: `bg-background`, `bg-sidebar`, `bg-card`
- text: `text-foreground`, `text-muted-foreground`,
  `text-sidebar-foreground`, `text-sidebar-accent-foreground`
- lines, states, accents: `border-border`, `border-input`,
  `border-sidebar-border`, `border-destructive`, `bg-sidebar-accent`,
  `bg-sidebar-primary`, `text-sidebar-primary-foreground`,
  `text-primary-foreground`, `text-destructive`,
  `text-destructive-foreground`, `text-success`, `text-warning`,
  `text-primary`, `outline-ring/50`
- one entrance utility (defined in `src/styles.css`, theme-owned):
  `animate-fade-in-up` on view roots

Shape uses Tailwind layout utilities plus `rounded-xl` form controls
and `rounded-2xl` calendar tiles. The retired SaaS idioms never
return: gradient hero/header washes, the `rounded-[28px]` hero/card,
stat-strip repetition, `hover-lift`, `animate-count-up`, and
`stagger-*` delays. No hex colors, `rgb()`, `oklch()`, hard-coded
Tailwind palette shades (`bg-red-500`, …), arbitrary color values
(`bg-[#…]`), or inline `style=` attributes in any `*.html` template.
Enforced by `src/app/design-tokens.spec.ts`.

## Semantic tokens

- `success`: gains, positive Net, winning days and cells
  (`oklch(0.64 0.16 145)` light / `oklch(0.74 0.18 145)` dark)
- `warning`: Guard warnings and breached-but-open states
  (`oklch(0.77 0.13 82)` light / `oklch(0.82 0.14 82)` dark)
- `destructive`: losses, negative Net, errors, destructive actions
- `dark`: class-based dark mode on `documentElement`, shared by the
  zinc layer and the PrimeNG Aura preset (`darkModeSelector`)

## Notes kept while converting

- Test-pinned native controls stay native: portfolio switcher and
  sidebar inputs, Guard and balance editors, month navigation and
  report-copy buttons, the global filter bar. Native is the
  platform-standard control; Aura skins it where a directive applies.
- The balance curve stays a hand-drawn SVG (no chart dependency);
  the Journal calendar stays a custom grid (close-date bucketing,
  Guard tints, and day selection have no PrimeNG equivalent).
