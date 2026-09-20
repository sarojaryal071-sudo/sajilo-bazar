# Sajilo Bazar — Design System

Goal: a professional, modern look — soft 3D depth, gradients, smooth motion — without
rebuilding the old project's runtime theming engine. This is a **static** design system:
fixed tokens and components, no admin-editable theming (that feature is dropped — see
`SCREENS.md`).

## Stack for this

- **Tailwind CSS** for styling — utility classes, one config file for tokens, no custom
  CSS-in-JS token engine like the old `ui-engine`/`ui-wiki` system.
- **Framer Motion** for animation — page transitions, card hover/press states, modal
  enter/exit, the live "waiting for worker" pulse, notification badges.
- Depth and "3D" feel come from **layered shadows, subtle gradients, and motion**, not
  literal 3D transforms/WebGL — that reads as more professional and is far cheaper to build
  and keep performant on mid-range Android phones, which is the real target device here.

## Visual language

- **Color**: one primary brand gradient (pick a direction — e.g. deep teal → emerald, or
  indigo → violet — something distinct from generic ride-hailing green/orange) used
  deliberately on primary actions, hero sections, and active states. Neutral surfaces
  (white/near-white in light mode, deep charcoal in dark mode) everywhere else — a gradient
  on every surface reads as cluttered, not premium.
- **Depth**: soft, layered box-shadows (not harsh drop shadows) to lift cards, modals, and
  the bottom nav off the background. Two elevation levels are enough: resting and
  raised/active.
- **Corners**: consistently rounded (e.g. `rounded-2xl` on cards, `rounded-full` on
  avatars/pills/buttons) — one radius scale used everywhere, not per-component overrides.
- **Motion**: purposeful, not decorative. Every animation should communicate a state
  change — a card lifting on tap, a screen sliding in, a live pulse on an online worker's
  status dot, a request card animating in when a new instant-request notification arrives.
  Keep durations short (150–300ms) so the app feels responsive, not slow.
- **Typography**: one type scale, one font family (a clean geometric sans — e.g. Inter or
  similar), weight used to establish hierarchy rather than size alone.

## Token structure

A single source of truth, not a runtime engine:

```
apps/web/src/styles/tokens.css     → CSS custom properties: colors, spacing, radius, shadow
tailwind.config.js                 → reads from / mirrors tokens.css
```

No `ui-engine`, `ui-wiki`, `themeOrchestrator`, or admin-editable token registry — if a
future need for real theming arises (e.g. white-labeling), that's a deliberate later
decision, not something to build speculatively now.

## Component guidance by screen type

- **Worker/service cards** (search results, home screen): elevated card, worker photo,
  gradient-accented rating badge, subtle lift + shadow-deepen on tap (Framer Motion
  `whileTap`).
- **Primary actions** (Book Now, Accept, Confirm): gradient-filled button, not flat color —
  this is the one place the brand gradient should always appear.
- **Instant-request live state**: a pulsing radar/ripple animation around the request while
  waiting for a worker to accept communicates "searching" without needing copy to explain
  it.
- **Status indicators** (online/offline, booking status): small animated dot (online =
  gentle pulse in the gradient's accent color) rather than a static color chip alone.
- **Admin panel**: same design system, same components — a professional, good-looking admin
  is in scope. What's out of scope is letting admin users edit these tokens/components live
  (the dropped UI-theming studio).

## What to avoid (lessons from the old project)

- No runtime/admin-configurable design tokens or component variants system
- No animation library sprawl — Framer Motion covers everything needed here
- No literal 3D transforms/perspective unless a specific interaction genuinely calls for it
  (e.g. a card flip) — depth via shadow and gradient reads as "3D/professional" without the
  performance cost
- Keep the component library small and reused everywhere — a Button, Card, Input, Modal,
  Avatar, Badge, and a handful of layout primitives should cover the vast majority of
  screens in `SCREENS.md`
