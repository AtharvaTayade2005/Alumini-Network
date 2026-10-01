---
name: swiss-dev-ui
description: Apply a Swiss/International Typographic Style UI system (as seen on vosslabs.org) to a project — dark, grid-based, numbered sections, monospace accents, minimal color, terminal/code motifs. Use when the user asks to redesign, restyle, or build a landing page / marketing site / dashboard in this "Swiss dev" aesthetic.
---

# Swiss Dev UI System

A design language that fuses **Swiss/International Typographic Style** (grids, restraint,
strong hierarchy) with a **developer/terminal aesthetic** (monospace labels, code blocks,
CLI motifs). Reference implementation: vosslabs.org.

Use this skill whenever asked to reskin a UI, build a landing page, or match "that clean
Swiss design with the numbered sections and dark background."

## Core Principles (apply in this order)

1. **Grid discipline first.** Every section aligns to a strict column grid. Nothing floats
   arbitrarily — spacing is systematic, not eyeballed.
2. **Typography carries the hierarchy**, not color or decoration. Size, weight, and
   letter-spacing do the work.
3. **Restraint.** Near-monochrome palette. Color/accent is used sparingly, as a signal, not
   as decoration.
4. **Numbered, labeled structure.** Sections are indexed like a spec document, not a brochure.
5. **Function over flourish.** Every visual element (terminal window, code block, stat
   counter) reads as "real," not decorative — like a tool, not a marketing graphic.

## Color Palette

- Background: near-black, `#0a0a0a` (not pure `#000`).
- Surface / card background: slightly lifted from base, e.g. `#111111`–`#161616`, with a
  1px `#2a2a2a`-ish border — borders do the separating, not shadows.
- Primary text: off-white `#f5f5f5` / `#fafafa` (not pure white — softer contrast).
- Secondary/muted text: mid-gray `#888`–`#999`.
- Tertiary/label text: dim gray `#555`–`#666`, often uppercase, used for eyebrows and meta.
- Accent color: **one** color only, used minimally (a single terminal-green, electric blue,
  or amber for links/highlights/status dots). Never more than one accent hue in the system.
- No gradients, no drop shadows for depth — depth comes from border + subtle bg-shift only.

## Typography

- **Two font families max**:
  - A clean grotesk/sans for headings and body (e.g. Inter, Geist, Söhne-style — Swiss
    grotesques like Helvetica/Neue Haas are the spiritual reference).
  - A monospace font for: labels, section numbers, code blocks, meta info, stats, buttons
    sometimes (e.g. JetBrains Mono, IBM Plex Mono, Berkeley Mono).
- Headings: large, tight `letter-spacing` (often slightly negative), heavy weight (600–800),
  low line-height.
- Eyebrows / labels: small monospace, uppercase, wide letter-spacing, dim gray — e.g.
  `VOSS / 2026`, `01 — WHAT WE DO`, `UPDATED 9D AGO`.
- Body copy: sans, moderate size (16–18px), generous line-height (1.5–1.7), muted gray
  rather than pure white for reduced eye strain.
- Section titles always prefixed with a **zero-padded number**: `01 —`, `02 —`, `03 —`.

## Layout Patterns

- **Numbered section system**: every major section gets `0X — Label` as an eyebrow, then a
  large heading below it. This is the single most identifying pattern of this style.
- **Grid-based content blocks**: repos/features/team shown as a strict grid of cards, each
  numbered (`01`, `02`, `03`...), each with consistent internal structure (number → title →
  description → meta/tag).
- **Terminal/code-block motifs**: real or faux terminal windows with a title bar
  (`~/project — zsh`), monospace body, `$` prompts, and blinking-cursor or `paused/resume`
  style interactive states. Use these to show process, install steps, or "how it works."
- **Concentric/tiered diagrams** for hierarchy or structure (e.g. org structure shown as
  concentric rings/circles labeled 01→05, innermost = most central).
- **Stat counters**: bold monospace numbers with muted labels beneath (`commits 0000`,
  `best 0000`), zero-padded for a "digital readout" feel.
- **Two-path / step-by-step sections**: numbered steps (`1. 2. 3. 4.`) laid out as a simple
  vertical or horizontal list, not cards with heavy chrome.
- **Footer**: minimal, grid of link columns (`Navigate`, `Connect`), small print at the very
  bottom (license, founding info) in dim monospace.
- Generous whitespace between sections; section boundaries implied by spacing and the
  numbering system, rarely by heavy dividers.

## Components / Motifs to Reuse

- Nav bar: logo/wordmark left, plain text links center/right, one CTA button (often
  outlined or ghost style) plus one filled "external" link with an arrow (`GitHub →`).
- Buttons: two tiers — a solid/filled primary button (light-on-dark) and a ghost/outlined
  secondary button. Sharp or barely-rounded corners (2–6px radius), never pill-shaped.
- Cards: numbered top-left or top-right, thin 1px border, subtle bg-lift on hover, no shadow.
- Tags/meta: uppercase monospace pills or plain text, e.g. `UPDATED TODAY`, language dot +
  label (`TypeScript`).
- Arrows (`→`, `↗`) used as inline UI punctuation for links and CTAs, not icon-only.
- Status/system copy in monospace, e.g. `merge conflict.`, `paused`, `✓ pull request opened`
  — treat UI copy like console output where relevant.

## What to Avoid

- No skeuomorphism, no glassmorphism, no heavy shadows/glows.
- No more than one accent color.
- No decorative stock imagery — illustration, if any, is geometric/diagrammatic, not photographic.
- No centered-everything layouts — Swiss grids are left-aligned and column-based.
- No rounded/pill buttons or bubbly UI — keep corners sharp/near-sharp.
- Don't skip the numbering system — it's the backbone of the hierarchy, not an accessory.

## Implementation Checklist (for an agent applying this)

1. Set global background to near-black, text to off-white/gray palette above.
2. Pick one grotesk sans + one monospace font; wire up as CSS variables/theme tokens.
3. Rebuild section headers as `0X — Label` (monospace, uppercase, dim) + large heading below.
4. Convert feature/content lists into numbered grid cards with consistent internal structure.
5. Add at least one terminal/code-block component for a "how it works" / install / process section.
6. Replace shadows with 1px borders + subtle background-lift for elevation.
7. Restrict buttons to two variants (filled + ghost), sharp corners, no gradients.
8. Use `→` / `↗` for link affordances instead of chevron icons where natural.
9. Keep one accent color only; audit the palette at the end to ensure nothing else crept in.
