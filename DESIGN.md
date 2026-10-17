# DESIGN.md — PrimeNG Aura Noir/Slate trading desk

Components render at PrimeNG Aura preset defaults customized once as `NoirSlate` (`src/app/app.config.ts` via `definePreset(Aura, …)`): primary maps to the zinc scale (noir monochrome variant), light + dark surfaces map to slate, `darkModeSelector: '.dark'` shared with the existing dark toggle. No per-component visual overrides, no custom palette, no custom motion on components. Source: v21 Noir + Surface theming docs and PrimeNG MCP `chart`/`datepicker`/`drawer`/`toolbar`/`menu`/`select`/`button` APIs.

Shell and surfaces use Tailwind layout utilities plus PrimeNG structure:

- shell: `p-drawer` (mobile) + static `aside` with `p-menu` Overview/Workspace, `p-toolbar` header with `p-avatar` brand, `p-tag` Net P&L pill, icon `p-button` nav/dark toggles; Portfolio switcher as `p-select`, inputs as `pInputText`, `p-dialog` manager + `p-confirmdialog` delete + `p-toast` feedback; `@ng-icons/lucide` for icons.
- data: sortable `p-table` everywhere (Trades history with paginator + CSV export + row expansion for notes and `{rule text, followed}` snapshot; Dashboard recent; Journal day detail; Analytics breakdowns/time-patterns/compliance), `p-chart` line for the balance curve and bar for breakdown Net (runtime `chart.js`), `p-datepicker` for filter range + Guard stop time (`timeOnly`), `p-inputnumber` for balance/Guard/count/price/quantity editors, `p-select` for every categorical axis (Market/Side/Setup/Emotion/Mistake/Grade/dimensions/filters), `p-checkbox` Playbook checklist, `p-textarea` notes, `p-chip` Tags, `p-tag` Net/Grade/Compliance/Guard/count states, `p-message` validation + Guard warnings.
- domain exceptions with PrimeNG around them: the Journal month calendar stays a custom UTC close-date grid (close-date bucketing, Guard tints, gain `+` prefix, flat `0` neutral, day selection have no PrimeNG equivalent); the log-form timestamps stay `pInputText` datetime-local (reactive form models UTC ISO strings).

The retired idioms never return: kickers/eyebrows, gradient hero/header washes, `rounded-[28px]` hero/card, stat-strip repetition as decoration, `hover-lift`, `animate-count-up`, `stagger-*` delays, colored `border-left` callouts, glass decoration. No hex colors, `rgb()`, `oklch()`, hard-coded Tailwind palette shades (`bg-red-500`, …), arbitrary color values (`bg-[#…]`), or inline `style=` attributes in any `*.html` template. Enforced by `src/app/design-tokens.spec.ts` (248 tests green).

## Semantic tokens

- `success`: gains, positive Net, winning days and cells, 100%-followed rules.
- `warning`: Guard warnings and breached-but-open states.
- `destructive`/`danger`: losses, negative Net, errors, destructive actions.
- `dark`: class-based dark mode on `documentElement`, shared by Tailwind and the PrimeNG Aura preset (`darkModeSelector`).

## Notes kept while building

- Tabular numerals in tables; chronological time-pattern rows (Monday→Sunday, 00→23, Intraday→Swing) with all fixed rows present even when empty.
- Derivations own the numbers (`.facts` + `GLOSSARY.md` untouched): Net P&L is the single source of truth; filtered views never create a second truth; Compliance/Mistake/Grade stay process signals independent of outcome.
- Production budget is 1MB warn / 1.5MB error (`angular.json`) for the PrimeNG + `chart.js` runtime.
