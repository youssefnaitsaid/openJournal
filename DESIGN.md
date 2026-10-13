# DESIGN.md — design token contract

All color and surface styling goes through the Spartan zinc theme
(`src/styles.css`, light + `:root.dark` variants). Templates may only use
theme token utilities:

- surfaces: `bg-background`, `bg-card`, `bg-sidebar`
- text: `text-foreground`, `text-muted-foreground`, `text-sidebar-foreground`
- accents: `bg-primary`, `text-primary-foreground`, `bg-sidebar-accent`,
  `text-sidebar-accent-foreground`
- lines: `border-border`, `border-input`
- states: `text-destructive`, `text-success`, `text-warning`, `outline-ring/50`
- motion/surface utilities (defined in `src/styles.css`, theme-owned):
  `animate-fade-in`, `animate-fade-in-up`, `animate-count-up`,
  `stagger-1`…`stagger-6`, `hover-lift`, `bg-gradient-hero`, `bg-gradient-header`

Shape uses Tailwind layout utilities plus the `rounded-[28px]` hero/card
and `rounded-2xl` stat idioms below. No hex colors, `rgb()`, `oklch()`,
hard-coded Tailwind palette shades (`bg-red-500`, …), arbitrary color
values (`bg-[#…]`), or inline `style=` attributes in any `*.html`
template. The theme owns the palette so light/dark stay consistent.
Enforced by `src/app/design-tokens.spec.ts`.

## Semantic tokens

- `success`: gains, positive trends, winning days (`oklch(0.64 0.16 145)` light / `oklch(0.74 0.18 145)` dark)
- `warning`: caution states (`oklch(0.77 0.13 82)` light / `oklch(0.82 0.14 82)` dark)
## Card idioms

- hero banner: `relative overflow-hidden rounded-[28px] border border-border bg-card` with a `bg-gradient-hero` overlay, headline number with `animate-count-up`, trend pill `rounded-full border border-border bg-background`
- stat strip: `rounded-2xl border border-border bg-card`, label `text-xs uppercase tracking-[0.18em] text-muted-foreground`, value `text-lg font-bold`
- content card: `overflow-hidden rounded-[28px] border border-border bg-card` with header row (gradient `rounded-2xl` icon tile + title/subtitle) and padded body
- empty state: gradient `rounded-[24px]` icon tile + title + description + `rounded-full` call to action
