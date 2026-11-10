---
name: Noctis
description: A personal instrument panel on a 60/30/10 palette — chalk, onyx, and one cobalt accent — where the chrome recedes so the readings stay bright.
colors:
  cobalt-blue: "#2f5bff"
  cobalt-blue-night-text: "#7f9cff"
  ember-amber: "#b9701f"
  ember-amber-night: "#d89552"
  verdant-signal: "#4b8b5f"
  verdant-signal-night: "#63a878"
  sodium-gold: "#928100"
  sodium-gold-night: "#b7a63d"
  oxblood-seal: "#8b3a4a"
  oxblood-seal-night: "#b0596a"
  deep-field: "#0c0d10"
  instrument-panel: "#15171b"
  hairline-grey: "#25272d"
  readout-white: "#f1efea"
  dim-label: "#9b9da4"
  graphite-rail: "#111216"
  paper-field: "#f4f2ed"
  paper-panel: "#fdfcfa"
  paper-hairline: "#e3e0d9"
  ink-readout: "#0e0f12"
  ink-dim: "#62646b"
  onyx-rail: "#0e0f12"
  plot-1: "#2a78d6"
  plot-2: "#eb6834"
  plot-3: "#1baf7a"
  plot-4: "#eda100"
  plot-5: "#e87ba4"
  plot-6: "#008300"
  plot-income: "#1baf7a"
  plot-expense: "#e34948"
typography:
  display:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.375
    letterSpacing: "normal"
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "normal"
  eyebrow:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "0.1em"
  readout:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  4xl: "26px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt-blue}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-blue}"
    textColor: "#ffffff"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.readout-white}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.dim-label}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-destructive:
    backgroundColor: "{colors.oxblood-seal-night}"
    textColor: "{colors.oxblood-seal-night}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.readout-white}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "32px"
  card:
    backgroundColor: "{colors.instrument-panel}"
    textColor: "{colors.readout-white}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "16px"
  badge:
    backgroundColor: "{colors.cobalt-blue}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.4xl}"
    padding: "2px 8px"
    height: "20px"
  nav-item-active:
    textColor: "{colors.readout-white}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "10px 12px"
---

# Design System: Noctis

## Overview

**Creative North Star: "The Observatory"**

Noctis is a dim room built so the readings glow. Every surface decision serves one
purpose: lower the luminance and the chatter of the chrome so that the things the user
actually came to read — a timer counting down, a seven-day streak, a month's cashflow,
a balance — are the brightest things on the screen. The interface dims itself so the
instruments stay legible. That is the whole thesis, and it is why the product is called
Noctis.

Both rooms are built on the same 60/30/10 split. By day the field is Chalk White, the
rail and the type are Onyx Black, and Cobalt Blue is the single accent. By night the
proportions swap — Onyx field, Chalk type — and cobalt keeps the same jobs. The two modes
are separately authored, and the tones are re-stepped per surface rather than inverted.
The user picks light, dark, or system; the choice lives in `localStorage` and is applied
as a `.dark` class on `<html>` before first paint. Depth is achieved the way it is in an actual instrument panel:
hairline seams and tonal shifts between adjacent surfaces, not shadows floating things
off the plane. The one exception is the one place it should be — genuine overlays that
really do sit above everything else.

Density is deliberate and tight. Controls are 32px tall, cards step in 16px, labels run
12px. This is a single-user instrument operated by someone who already knows where
everything is, so the space goes into separating readings from one another, not into
making the interface feel spacious. Color is the navigation system: each domain owns one
hue, and that hue appears as a 4px rail, a 14%-mix chip, and an icon tint — never as a
wash across a whole surface.

**Key Characteristics:**

- 60/30/10 in both themes: one neutral field, one opposing neutral, one cobalt accent
- Light, dark, and system modes; both themes separately authored and contrast-checked
- Flat surfaces separated by hairline rings; shadows reserved for true overlays
- One hue per domain, used as a signal at small scale, never as a background wash
- Monospace is for numbers only — it marks a value as a reading
- Compact and precise: 32px controls, 16px card rhythm, 12px labels
- Charts are the brightest ink on the page; chrome recedes beneath them

## Colors

Two separately authored palettes — a chalk day palette and an onyx night palette — each
split 60/30/10, sharing one cobalt accent and four domain hues re-stepped per surface.

| | 60 | 30 | 10 |
| --- | --- | --- | --- |
| **Day** | Chalk White — field `#f4f2ed`, panels `#fdfcfa` | Onyx Black — the rail `#0e0f12` and all type | Cobalt Blue `#2f5bff` |
| **Night** | Onyx Black — field `#0c0d10`, panels `#15171b` | Chalk White type `#f1efea`, on a graphite rail `#111216` | Cobalt Blue `#2f5bff` |

### Primary

- **Cobalt Blue** (`#2f5bff`): The ten. The system accent, and the only fill that is
  deliberately identical in both themes; it always carries white (5.2:1). Primary
  buttons, focus rings, the user's chat bubble, selected dates, the mobile chat button.
  Where cobalt is *type or an icon* rather than a fill — links, the Dashboard and Pomodoro
  nav tint, stat readouts — it uses `--color-primary-text`: the same `#2f5bff` on chalk
  (4.6:1), stepped up to `#7f9cff` on onyx (7.5:1), because the fill is only 3.8:1 there.

### Secondary — the domain tones

Four hues, one per feature area. These are wayfinding, not decoration: they tell the
user which instrument they are looking at.

- **Ember Amber** (`#b9701f` day / `#d89552` night): Tasks. Warm, slightly burnt, the
  color of something still to be dealt with.
- **Verdant Signal** (`#4b8b5f` day / `#63a878` night): Habits. Deliberately muted, so a
  logged habit registers as "nominal" rather than as a reward.
- **Sodium Gold** (`#928100` day / `#b7a63d` night): Finance. Named for the sodium-vapour
  street lamp, which is exactly this amber-gold rather than a spectral yellow. Re-stepped
  into the sibling band so money reads as a domain, not as an alarm.
- **Oxblood Seal** (`#8b3a4a` day / `#b0596a` night): Passwords, and doubling as the
  system's destructive color. Deep, sealed, unwelcoming by design — it guards the vault
  and it warns before deletion.

### Neutral — night

- **Deep Field** (`#0c0d10`): The room. Onyx page background.
- **Instrument Panel** (`#15171b`): Cards and the bottom nav. Reads as a panel set into
  the field, one tonal step up.
- **Graphite Rail** (`#111216`): The sidebar and mobile top bar, half a step off the field.
- **Hairline Grey** (`#25272d`): Borders, dividers, scrollbar thumbs, and the unlit
  state of streak pips.
- **Readout White** (`#f1efea`): Primary text. Chalk, never pure white — pure white
  on a near-black field glares.
- **Dim Label** (`#9b9da4`): Secondary text, inactive nav, hints, units.

### Neutral — day

- **Paper Field** (`#f4f2ed`): Page background. Chalk White — warm, not clinical.
- **Paper Panel** (`#fdfcfa`): Cards and panels.
- **Paper Hairline** (`#e3e0d9`): Borders and dividers.
- **Ink Readout** (`#0e0f12`) / **Ink Dim** (`#62646b`): Primary and secondary text.
- **Onyx Rail** (`#0e0f12`): The sidebar and mobile top bar. This is where the day
  theme's thirty lives: a dark island carrying the night tokens (`.theme-inverse`).

### Tertiary — the plot palette

Six categorical chart slots plus a signed income/expense pair, re-stepped per theme.
These are the only colors permitted to appear at high chroma in quantity, because they
are the readings.

- **Plot 1–6** (`#2a78d6`, `#eb6834`, `#1baf7a`, `#eda100`, `#e87ba4`, `#008300`):
  Fixed order. Assigned by index, never chosen by eye.
- **Plot Income** (`#1baf7a`) / **Plot Expense** (`#e34948`): Signed values only.

### Named Rules

**The 60/30/10 Rule.** Sixty is the field and its panels, thirty is the opposing neutral
(the rail and the type), ten is cobalt. Cobalt is the only chromatic chrome: if a second
hue is doing an interface job — a button, a focus ring, a selected state — it is wrong.
Domain tones and plot inks do not count toward the ten because they are readings, and
they stay at signal scale.

**The Dark Island Rule.** Anything that is dark in both themes — the rail, the mobile
top bar, the pomodoro floating panels — takes the `theme-inverse` class and nothing else.
The class re-steps every token for an onyx surface, so components inside never branch on
the theme.

**The Signal Rule.** A domain tone never becomes a background. It appears as a 4px
rail, a `color-mix(… 14%, transparent)` chip behind an icon or an active nav item, a
2px section dot, a 1.5×4px streak pip, or an icon tint. If a domain tone is filling more
than roughly a tenth of a surface, the surface is wrong, not the tone.

**The Fixed Order Rule.** Chart series take `plot-1` through `plot-6` in declaration
order. The order is fixed because it was validated as a set for color-vision deficiency
and for contrast on both surfaces. Reordering to "look better" silently breaks that
validation.

**The Separate Authorship Rule.** Every token that changes between themes is written
by hand for its surface. No token is derived from its counterpart by inversion,
lightening, or an automatic filter. A new color needs two values, checked independently.

**The Sibling Band Rule.** All four domain tones occupy one bounded band, and a fifth
would have to join it. On the light surface: lightness 46–65%, chroma 0.095–0.130,
landing between 3.4:1 and 6.7:1 against Paper Field. On the dark surface: lightness
57–72%, chroma 0.100–0.125, landing between 4.1:1 and 7.9:1 against Deep Field. A tone
outside that band does not read as a sibling — it reads as an alarm. Measure before
adding one.

## Typography

**Heading Font:** Geist (with `system-ui`, `sans-serif`) — `--font-display`, `--font-heading`
**Body Font:** IBM Plex Sans (with `system-ui`, `sans-serif`) — `--font-body`
**Readout Font:** JetBrains Mono (with `ui-monospace`, `monospace`) — `--font-mono`

**Character:** Three families with three jobs, and no overlap between them. Geist names
things: tight, neutral, contemporary, with the low contrast that lets a 24px page title
sit calmly rather than announce. IBM Plex Sans carries the prose with a slightly
technical, humanist warmth — engineered but not cold. JetBrains Mono is reserved
entirely for numerals, where its tabular figures keep a running timer and a column of
currency from shifting width as they change.

The split is enforced by variable, not by convention: `--font-display` and
`--font-heading` both resolve to Geist, `--font-body` to Plex, `--font-mono` to
JetBrains. Nothing picks a family by class name.

### Hierarchy

- **Display** (JetBrains Mono, 400, 3rem / 48px, 1): The timer readout. One per screen,
  and only where a number *is* the screen.
- **Headline** (Geist, 400, 1.5rem / 24px, 1.3): Page titles — every surface's H1. Auth
  screens drop to 1.25rem / 20px; the Noctis wordmark in the sidebar and mobile header
  sits at 1.125rem / 18px. Notably never bold — the product does not announce itself.
- **Title** (Geist, 500, 1rem / 16px, 1.375): Card, dialog, and empty-state titles, via
  the `font-heading` utility. Drops to 0.875rem on `size="sm"` cards.
- **Body** (IBM Plex Sans, 400, 0.875rem / 14px, 1.5): Everything the user reads. Also
  the size of nav items, section headings, and list rows — the system does not enlarge
  a heading merely because it is a heading; it changes weight and color instead.
- **Readout** (JetBrains Mono, 400, 1.125rem / 18px): Stat tile values, currency,
  counts. Always tinted with the domain tone.
- **Label** (IBM Plex Sans, 400, 0.75rem / 12px, 1.33): Hints, units, timestamps,
  secondary lines. Rendered in Dim Label.
- **Eyebrow** (IBM Plex Sans, 400, 0.75rem / 12px, `letter-spacing: 0.1em`, uppercase):
  The phase label above the timer. The only uppercase text in the system.

### Named Rules

**The Numerals Rule.** If it is a number the user reads as a measurement — a duration,
a count, a streak, an amount — it is JetBrains Mono. If it is a number inside a
sentence, it is not. Mono is a semantic marker here, not a style.

**The Weight-Not-Size Rule.** Below the page title, hierarchy is carried by weight
(400 → 500) and color (Dim Label → Readout White), not by type scale. Body, nav, and
section headings all sit at 14px. Only three things earn a larger size: the page title
(24px), a card title (16px), and a genuine readout.

**The Three Jobs Rule.** Geist names, Plex explains, JetBrains measures. A family is
never chosen for texture — if a face is being used for a fourth reason, the reason is
wrong.

## Layout

The application shell is exactly one viewport tall (`h-dvh`, deliberately not
`min-h-dvh`) with `overflow-hidden`, so `<main>` is the only scrolling region and the
header and nav never scroll away.

**Desktop (≥768px):** A fixed 256px sidebar on the left holding the wordmark, the seven
domain links, and a profile/sign-out foot. Content sits in a 32px-padded scroll region.
The sidebar is the opaque rail (`--color-rail`): onyx by day, graphite by night, with the
light/dark/system switch at its foot. The same switch, labelled, sits on the Profile page.

**Mobile (<768px):** The sidebar is replaced by a 12px-padded top bar in the rail colour (wordmark left,
profile and a circular chat button right) and a fixed bottom nav carrying the **first
five** destinations only — Dashboard, Tasks, Habits, Pomodoro, Finance. Passwords and
Chat are reached from the top bar and the command palette. Content padding drops to
16px, with 80px of bottom padding to clear the nav.

**Rhythm:** A 4px base scale. Cards space their contents at 16px (`--card-spacing`,
dropping to 12px on `size="sm"`). Nav rows are 12px × 10px. Icon-to-label gaps are 12px
at nav scale, 6px inside controls. Section headers sit 12px above their content.

**Density:** Grids favor more columns over larger cards. Text truncates with `truncate`
rather than wrapping in tiles and rows; a stat tile is a fixed-height reading, not a
container that grows.

### Named Rules

**The One Scroller Rule.** The shell owns the viewport; only `<main>` scrolls. Anything
that would make the document itself scroll is a bug, not a layout choice.

**The Five Rule.** The mobile bottom nav carries five destinations. When an eighth
domain arrives, it goes to the top bar and the command palette — not into the bar.

## Elevation & Depth

The system is flat by strong default. Surfaces are separated by a one-pixel ring at
10% of the foreground color (`ring-1 ring-foreground/10`) and by a single tonal step
between the field and the panel sitting on it. There is no ambient shadow vocabulary and
no elevation scale; nothing hovers a few pixels off the page to suggest importance.

Shadows appear only where an element genuinely leaves the plane — Radix overlays
(popover, select content, chart tooltip). Those carry `shadow-md`, or `shadow-xl` on the
chart tooltip, alongside the same hairline ring the flat surfaces use. Floating panels
use `backdrop-blur-xl` over a translucent surface, which reads as translucency rather
than as lift. The primary button's one-pixel inset top highlight is a bevel on the
control itself, not elevation.

This is strong guidance rather than an absolute ban: if a future surface has a real
reason to introduce elevation, it needs a reason, and it should extend the vocabulary
deliberately rather than reaching for a default Tailwind shadow.

### Shadow Vocabulary

- **Overlay** (`shadow-md` + `ring-1 ring-foreground/10`): Popover and select content.
  Paired with a 100ms fade-and-zoom entrance.
- **Tooltip** (`shadow-xl` + `border-border/50`): Chart tooltips only, where the surface
  must read clearly over dense plotted ink.

### Named Rules

**The Off-Plane Rule.** A shadow means the element has physically left the page. If it
is still part of the layout, it gets a hairline ring and a tonal step instead.

## Shapes

One radius scale derived from a single root value (`--radius: 0.625rem` / 10px), stepped
by multiplication: sm 6px, md 8px, lg 10px, xl 14px, 2xl 18px, 4xl 26px.

Assignment is consistent and worth learning: **controls are `lg` (10px)** — buttons,
inputs, icon buttons. **Panels are `xl` (14px)** — cards, active nav items. **Feature
surfaces are `2xl` (18px)** — SpotlightCard. **Anything that reads as a token or a
status is fully round** — badges (`4xl` at 20px tall, effectively a pill), streak pips,
section dots, timer phase indicators, avatar buttons, mode pills.

Borders are hairline and low-contrast throughout; the system never uses a heavy or
colored border to create emphasis. Emphasis arrives as a filled chip at 14% tone mix, or
as a 4px rail against the left edge of an active nav row.

Iconography is Lucide at `strokeWidth: 1.75` — slightly lighter than the default, sized
16px inside controls and 20px in navigation.

### Named Rules

**The Round-Means-Status Rule.** A fully rounded shape signals state, not action.
Pills, pips, and dots report; rectangles with 10px corners are the things you click.

## Components

### Buttons

- **Shape:** Gently curved (`rounded-lg`, 10px), dropping to a clamped
  `min(var(--radius-md), 12px)` at `sm`/`xs` so small controls stay proportional.
- **Sizes:** Compact by default — 32px tall (`h-8`) with 10px horizontal padding.
  `sm` 28px, `xs` 24px, `lg` 36px. Square icon variants at each step.
- **Primary:** Cobalt Blue fill with white text in both themes, and a one-pixel inset
  top highlight. Hover drops the fill to 90% opacity.
- **Outline:** Transparent over the page with a Hairline border; in night mode the fill
  becomes `input/30` and hovers to `input/50`.
- **Ghost:** No chrome at rest; hovers to a muted fill. The default for row-level
  actions.
- **Destructive:** Oxblood at 10% fill with Oxblood text (20% in night mode) — a tinted
  warning, never a solid red button.
- **Focus:** A 3px `ring-ring/50` ring plus a border shift to Cobalt Blue. Never
  removed.
- **Press:** `translate-y-px` — a single pixel of travel, suppressed on menu triggers.
- **Invalid:** `aria-invalid` switches the border and ring to Oxblood automatically.

### Cards

- **Corner Style:** `rounded-xl` (14px), with images clipped to the top and bottom
  corners automatically.
- **Background:** Instrument Panel (night) / Paper Panel (day).
- **Border:** `ring-1 ring-foreground/10` — a hairline, not a solid border.
- **Shadow Strategy:** None. See Elevation & Depth.
- **Internal Padding:** 16px via `--card-spacing`, dropping to 12px at `size="sm"`.
  Footers invert to a `muted/50` fill with a top border and reclaim the card's bottom
  padding.
- **Title:** Geist 16px/500. Description: 14px in the muted tone.

### Inputs / Fields

- **Style:** 32px tall, transparent fill with a Hairline border, `rounded-lg`, 10px
  horizontal padding. Night mode fills to `input/30`.
- **Type size:** 16px on mobile dropping to 14px at `md` — deliberate, to stop iOS
  zooming the viewport on focus.
- **Focus:** Border shifts to Cobalt Blue with a 3px `ring-ring/50` ring.
- **Error:** `aria-invalid` gives an Oxblood border and ring.
- **Disabled:** 50% opacity, `not-allowed` cursor, and a filled background.

### Navigation

- **Desktop rows:** 14px medium text, `rounded-xl`, 12px × 10px padding. Inactive rows
  are Dim Label and hover to a 30% Hairline fill. Active rows get three things at once:
  a `color-mix(… 14%, transparent)` chip in the domain tone, a 4px × 20px fully rounded
  rail pinned to the left edge in the same tone, and the icon tinted to that tone while
  the label goes Readout White.
- **Mobile bar:** Five items, icon over an 11px label, active state carried by icon tint
  alone.
- **Command palette:** ⌘K, hinted at 10px in the chat row of the sidebar.

### Badges

- **Style:** 20px tall pill (`rounded-4xl`), 8px horizontal padding, 12px medium text.
  Variants mirror the button set — default (Cobalt fill), secondary, outline, ghost,
  and a 10%-fill destructive.

### Signature: The Breathing Timer

The Pomodoro readout is the system's one moment of expression, and it earns it by being
the one screen where a number is the entire point. A 256px square holds an SVG progress
ring; the elapsed arc animates over 500ms. Inside sits the eyebrow phase label
(uppercase, `tracking-widest`, Dim Label) above a 48px JetBrains Mono readout. Below,
fully rounded session pips fill as intervals complete.

While the timer runs, the whole assembly scales between 1 and 1.015 on a 4-second
`ease-in-out` loop — a breath, not a pulse. It is gated behind `motion-safe:`, and the
global `prefers-reduced-motion` block collapses every animation and transition in the
app to 0.01ms.

### Signature: Aurora Auth Field

The login and register screens sit over a full-bleed WebGL field (`ColorBends`, Three.js
fragment shader) rendered in `#2f5bff`, `#1b2f8f`, `#0c0d10` — slowly warping bands, an
aurora over the dark field. It is `pointer-events-none` and `aria-hidden`, sits at
`-z-10`, and appears **only** on the unauthenticated layout. Inside the app the room is
plain; the aurora is the threshold, not the environment.

### Signature: Spotlight Card

An 18px-radius panel that tracks the cursor with a radial gradient in Cobalt Blue at
22% alpha, fading in to 0.6 opacity over 500ms on enter and focus. Used on the profile
and pomodoro surfaces. It responds to keyboard focus as well as hover.

### Marquee

Overflowing text scrolls at a constant 40px/second — duration is computed from measured
width, so a long title and a short one move at the same speed. Edges are masked with a
transparent-to-opaque gradient at 8% and 92%. Re-measures on resize and after fonts
settle.

### Scrollbars

Any scroll container tagged `.thin-scroll` (and shadcn's table wrapper, which is
selected by attribute because it can't be reached from JSX) gets a 6px track,
transparent background, and a fully rounded Hairline thumb that lightens to Dim Label on
hover.

## Appearance (user-set)

Profile → Appearance lets the user change, per device: theme, accent (cobalt, violet, emerald,
crimson, amber, teal, onyx), base tone (warm, neutral, cool), density, text size, corners, card
style (flat, elevated, outlined, glass), spotlight, sidebar (expanded or icon rail), content width
and motion. Stored in `localStorage` (`noctis-appearance`), applied before first paint as one
`data-*` attribute per setting on `<html>` (`lib/appearance.ts`), and styled entirely in
`globals.css` — no component branches on a setting, so the server render never disagrees.

- **Accent presets** are six hand-checked values each (`--ac-fill/fg/text` × light/dark). A new
  accent needs all six, white-or-fg on fill ≥ 4.5:1 and text ≥ 4.5:1 on every base.
- **Density** scales Tailwind's `--spacing`; **text size** scales the root font size.
- **Layout** uses the `rail:` and `contained:` custom variants; a full-bleed page sets `data-bleed`.

## Motion

Springs, not durations. Interactive motion (nav highlight, hover highlight, segmented controls,
list reorders, readouts) is motion/react with the house spring in `Providers.tsx`; it keeps
velocity when interrupted. CSS motion (page entry, card stagger, overlays, press feedback, rail
width) uses `--ease-spring*` — `linear()` curves sampled from a real damped spring, so both
systems settle the same way. Everything collapses under OS reduce-motion or Appearance → Motion.

- A highlight that follows navigation moves on the click, not on the route change (router
  updates commit in a transition, where layout animations snap).
- Entrance animations use `fill-mode: backwards` — nothing stays transformed at rest.

## Do's and Don'ts

### Do:

- **Do** author both theme values by hand for any new color, check each against its own
  surface, and confirm it lands inside the Sibling Band before shipping it.
- **Do** reach for a family by its variable — `--font-display`/`--font-heading` for
  Geist, `--font-body` for Plex, `--font-mono` for JetBrains. Never by class name.
- **Do** use JetBrains Mono for any number the user reads as a measurement, tinted with
  the owning domain tone.
- **Do** carry a domain tone at signal scale — a 4px rail, a 14% mix chip, a 2px dot, an
  icon tint — and let the surface underneath stay neutral.
- **Do** separate surfaces with `ring-1 ring-foreground/10` and one tonal step.
- **Do** keep controls at 32px and card rhythm at 16px. Density is the point.
- **Do** gate every animation behind `motion-safe:`; the global reduced-motion block
  handles the rest.
- **Do** assign chart series `plot-1` through `plot-6` in fixed order.
- **Do** size mobile inputs at 16px and drop to 14px at `md`, so iOS doesn't zoom.

### Don't:

- **Don't** add a shadow to something that is still part of the layout. Shadows mean the
  element genuinely floats.
- **Don't** introduce a domain tone outside the Sibling Band. High chroma reads as an
  alarm, not as a category — that is why Finance is gold and not spectral yellow.
- **Don't** fill a card, header, or panel background with a domain tone. The Signal Rule
  caps it at roughly a tenth of a surface.
- **Don't** create hierarchy by enlarging type below the display readout. Change weight
  and color; body, nav, and section headings share 14px.
- **Don't** put pure white text on Deep Field. Readout White (`#f1efea`) exists because
  pure white glares on a near-black field. (White on a cobalt fill is the one exception.)
- **Don't** use `--color-primary` for type or icons on a surface — that is what
  `--color-primary-text` is for. The fill fails contrast as text on onyx.
- **Don't** add a second accent hue to the chrome. The ten is cobalt and only cobalt.
- **Don't** let the document scroll. Only `<main>` scrolls; the shell is exactly one
  viewport.
- **Don't** add a sixth item to the mobile bottom nav.
- **Don't** drift toward enterprise density — no 11px grey-on-grey tables, no nested nav
  levels, no columns the user didn't ask for. Compact is not a terminal.
- **Don't** drift toward consumer-cute — no mascot illustrations, no pastel blob
  backgrounds, no emoji-led empty states. The `Empty` component states the fact and
  offers the action.
- **Don't** use a heavy or colored border for emphasis. Emphasis is a 14% tone chip or a
  4px rail.
