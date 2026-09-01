# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single person — the developer — running Noctis on their own server for their own
daily use. Self-hosted, single-tenant by intent. There is no second audience: no
prospective customer, no team, no public signup funnel. Design decisions optimize for
one person who already knows the product, not for someone being convinced or taught.

The usage scene spans a phone (installed PWA, used throughout the day in short bursts)
and a desktop browser (longer sessions: reviewing finances, planning tasks).

## Product Purpose

Noctis consolidates the instruments of a personal day — tasks, habits, focus sessions,
money, secrets — into one application with one shared context, and puts an AI assistant
on top that can see across all of it.

Success is that the user reaches for Noctis instead of five separate apps, and that the
assistant's unprompted check-ins are worth reading rather than worth muting.

## Positioning

Two things a generic to-do app could not truthfully claim:

1. **The AI initiates.** A BullMQ scheduler runs three fixed check-ins a day (08:00,
   13:00, 21:00). Each one loads the user's real pending tasks, habit streaks, expense
   categories, recent transactions, and month-to-date spend, then asks the model to
   decide whether a nudge is warranted at all — `shouldNudge` can come back false and
   nothing is sent. The user does not prompt it; it decides whether to speak.
2. **One instrument, not six apps.** Tasks, habits, focus, and finance share a single
   data context, so the assistant can reason across domains in a way siloed apps
   structurally cannot. The passwords vault is deliberately outside that context — the
   system prompt states the assistant has no access to saved passwords and must say so
   if asked.

## Operating Context

- Runs as an installed PWA on a phone and as a normal web app on desktop.
- Fully self-hosted: Postgres and Redis as local containers, the API and web app on the
  user's own machine or server. Nothing depends on a third-party account unless the user
  chooses a cloud AI provider.
- Seven authenticated surfaces: Dashboard, Tasks, Habits, Pomodoro, Finance, Passwords,
  Noctis Chat. Plus login and register.
- The vault holds its key in memory only: it locks on reload, on tab close, on a manual
  lock, and after a configurable idle timeout (15 minutes by default).
- A command palette is available across the app shell.
- The Pomodoro surface includes a music panel backed by a server-side YouTube search
  endpoint; results play through the YouTube IFrame player.

## Capabilities and Constraints

**Stack (existing, not up for re-decision):** pnpm monorepo. `apps/web` is Next.js 15
(App Router, React 19, Tailwind v4, shadcn/Radix, Zustand, motion, Recharts, three).
`apps/api` is Fastify as a modular monolith. `packages/db` is Prisma + Postgres.
`ai/agent` holds the LLM provider abstraction, nudge scheduler, and chat handler.

**AI providers:** pluggable — Ollama (local, the default), Groq, Claude, Gemini. The
local option must remain viable; the product cannot assume a cloud key exists.

**Auth:** email + password against the user's own API. No third-party identity provider.

**Passwords vault:** zero-knowledge, on Bitwarden's key model. A random AES-256 vault
key is *wrapped* under a key derived from the master password (PBKDF2-SHA256, 600k
iterations) with a server-held salt; the server stores the wrapped key and opaque
per-item blobs and never sees a name, username, URL, note or password. Because the vault
key is wrapped rather than derived, the master password can change without re-encrypting
any item, and every device that knows the password derives the identical key. A failed
unwrap is the wrong-password check — there is no separate verifier. The master password
is deliberately separate from the Noctis login password, which does reach the server.
Consequence: there is no recovery path, and search and sort are client-side.

**Known gap:** the frontend never calls `POST /notifications/subscribe`, so web push
does not fire yet even with VAPID keys configured. The nudge pipeline produces nudges;
the delivery wiring to the browser is unbuilt.

**Undecided:** whether push notification delivery gets built.

## Brand Commitments

- Name: **Noctis**. Night. The name is the tone brief — the product should read calm and
  nocturnal, not energetic or gamified.
- Voice, as fixed in the assistant's system prompt: calm, concise, precise. Never invents
  data it was not given.
- Logo and favicon are hosted at `cdn.julianwardana.dev/Noctis/`.
- Existing type pairing: IBM Plex Sans (body/display) + JetBrains Mono, with Geist
  mapped to `--font-sans`.

## Evidence on Hand

Real running product with real personal data behind auth. No testimonials, no customers,
no benchmarks, no press, no pricing, no usage numbers — none exist and none may be
fabricated. There is no marketing surface and none is planned.

## Product Principles

1. **One person, already onboarded.** No tutorials, no activation funnels, no
   explanatory chrome for a newcomer who will never arrive. Density and speed beat
   hand-holding.
2. **The assistant earns its interruptions.** Silence is a valid output. A nudge that
   isn't worth reading costs more than no nudge.
3. **Mobile-first, and it means it.** The phone is a primary surface, not a responsive
   fallback. Touch targets, thumb reach, and offline behavior are load-bearing.
4. **Dark is first-class.** Both themes get equal design attention; neither is derived
   from the other by inversion.
5. **Feature tone is identity.** The per-feature accent system (tasks / habits / finance
   / passwords) is how the user knows where they are at a glance. It is structure, not
   decoration.
6. **Self-hosted means self-contained.** Anything that quietly requires a third-party
   account breaks the premise.

## Accessibility & Inclusion

No formal standard has been set. The existing chart palette is already stepped
separately per theme and annotated as validated for color-vision deficiency and
contrast — treat that as the established bar for any new color work rather than
regressing to an automatic light/dark flip.
