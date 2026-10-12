# DESIGN.md — design token contract

All color and surface styling goes through the Spartan zinc theme
(`src/styles.css`, light + `:root.dark` variants). Templates may only use
theme token utilities:

- surfaces: `bg-background`, `bg-card`, `bg-sidebar`
- text: `text-foreground`, `text-muted-foreground`, `text-sidebar-foreground`
- accents: `bg-primary`, `text-primary-foreground`, `bg-sidebar-accent`,
  `text-sidebar-accent-foreground`
- lines: `border-border`, `border-input`
- states: `text-destructive`, `outline-ring/50`

No hex colors, `rgb()`, `oklch()`, hard-coded Tailwind palette shades
(`bg-red-500`, …), or arbitrary color values (`bg-[#…]`) in any
`*.html` template. The theme owns the palette so light/dark stay consistent.
Enforced by `src/app/design-tokens.spec.ts`.
