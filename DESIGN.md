# watchlr design language

The single source of truth for how watchlr looks and feels. Read this before
touching any UI. When in doubt: warmer, wonkier, more handcrafted.

**Vibe in one line:** a playful, childish, sticker-covered movie zine — the
energy of allthingswtf.com, never a generic SaaS dashboard.

---

## hard rules (never break these)

1. **No emoji. Ever.** Also no text dingbats (`✦ ★ ✓ ⚠ →` etc.) in copy.
   Playfulness comes from Lucide icons in sticker tiles, rotation, and
   animation — not emoji.
2. **Everything lowercase.** Enforced globally via
   `body { text-transform: lowercase }` in `app/globals.css`. Exempt: `input`,
   `textarea`, `code` (case is load-bearing there). Never add all-caps string
   literals or Tailwind `uppercase` classes.
3. **No wide letter-spacing.** No `tracking-wider`, no `tracking-[0.Xem]`.
   `tracking-tight` on big display headings is fine (tighter, not wider).
4. **No dark mode, no black backgrounds, no neon, no glassmorphism, no
   gradient-heavy surfaces.**
5. **Only palette tokens.** The Tailwind default palette is wiped
   (`--color-*: initial`); if a color isn't a token below, it doesn't exist.
6. **Lucide icons only** (react-icons only if Lucide truly lacks a glyph).
7. **Respect `prefers-reduced-motion`** — global override lives in
   `globals.css`; use `useReducedMotion()` for framer-motion effects.

---

## tokens (defined in `app/globals.css` `@theme`)

### color

| token | value | use |
|---|---|---|
| `background` | `#f6efe3` | beige page bg (with dot grid, see below) |
| `card` | `#ffffff` | card surfaces |
| `ink` | `#1d1d1d` | text, borders, hard shadows |
| `muted` | `#666666` | secondary text |
| `border` | `#ece7de` | quiet borders (non-interactive) |
| `accent` | `#f59e52` | orange — CTAs, highlights, active fills |
| `accent-soft` | `#ffdfa8` | soft amber — chips, tiles, watermarks |
| `surface-hover` | `#fff6e7` | warm hover fill |

### background

The `body` paints beige plus a **polka-dot grid**: warm tan dots at 50%
opacity (`radial-gradient(rgb(213 184 133 / 0.5) 1.5px, transparent 1.5px)`,
`26px` spacing). Full-bleed sections that want the dots to show through
should stay **transparent** (like the footer) rather than repainting.

### type

- Font: **Bricolage Grotesque only** (`next/font/google`, var `--font-bricolage`).
- Display headings: `font-black tracking-tight`, oversized (`text-6xl`–`text-8xl` hero, `text-4xl`–`text-6xl` page titles).
- Overlines: `overline-track` utility — small, bold, lowercase, normal spacing.
- **Offset text shadows** on display type:
  - `text-offset` → `0.045em` amber (`accent-soft`) shadow. Use on page h1s, section h2s, stat numbers.
  - `text-offset-accent` → `0.05em` orange shadow. Hero-scale only.
- Accent-word underlines: MagicUI `<Highlighter action="underline" color="#f59e52">`
  (`components/ui/highlighter.tsx`, rough-notation) — never CSS underlines for
  display copy. Use `isView` for below-the-fold instances.

### shadows

| token | value | use |
|---|---|---|
| `shadow-offset-xs` | `2px 2px 0 ink` | small stickers, badges, icon tiles, avatars |
| `shadow-offset-sm` | `3px 3px 0 ink` | buttons at rest, bubbles, rail arrows |
| `shadow-offset` | `5px 5px 0 ink` | cards (mood cards, stat tiles, auth card), button hover |
| `shadow-offset-lg` | `7px 7px 0 ink` | card hover state |
| `shadow-offset-down` | `0 3px 0 ink + soft falloff` | navbar (3d slab, bottom edge) |
| `shadow-offset-up` | `0 -3px 0 ink + soft falloff` | footer (3d slab, top edge) |
| `shadow-soft` / `shadow-lift` | soft blurs | poster imagery only — photos get soft shadows, ui gets hard ones |

**Rule of thumb:** interactive/sticker elements get hard offset shadows with
`border-2 border-ink`; photographic content (posters, stills) keeps soft
shadows and `border-border`.

---

## the press mechanic (all solid buttons)

Buttons must feel physically pushable:

```
shadow-offset-sm
hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-offset
active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
transition-all duration-150
```

Small elements use the xs/sm pair with `2px` active travel. `Button`
(`components/ui/Button.tsx`) already implements this — **always reuse it**;
only hand-roll on `<Link>`s styled as buttons.

---

## signature moves (reach for these)

- **Rotation everywhere:** icon tiles `-rotate-6`, stickers `±2–3deg`,
  cards alternate `-rotate-2 / rotate-1 / rotate-2 / -rotate-1`, hover often
  straightens (`hover:rotate-0`) or wiggles.
- **Sticker chips:** `rounded-full border-2 border-ink bg-accent-soft
  shadow-offset-xs` + slight rotation. Active tabs/pills everywhere use
  `-rotate-1 bg-ink text-white shadow-offset-xs`.
- **Speech bubbles:** hand-drawn wobble via
  `rounded-[255px_15px_225px_15px/15px_225px_15px_255px]` + a rotated-square
  tail (`rotate-45 border-b-2 border-r-2`).
- **Floating stickers:** `animate-float` (5s bob) with staggered
  `animationDelay`, icon inside a bordered accent-soft tile.
- **Wiggle:** `animate-wiggle` / `group-hover:animate-wiggle` for icons on hover.
- **Marquee:** full-bleed, `-rotate-1`, accent bg, ink borders, spinning
  Sparkle separators (`animate-spin-slow`).
- **Sliding nav pill:** active nav state is a tilted sticker pill moved
  between links with framer `layoutId` + spring.
- **Watermark wordmark:** footer paints one giant lowercase "watchlr" in solid
  `accent-soft`, absolutely positioned behind content, `aria-hidden` +
  `pointer-events-none`.
- **Poster cards:** framer spring `whileHover={{ y: -6, rotate: ±1.5 }}`,
  image zoom, sticker rating badge.
- **Focus states:** inputs sharpen to `border-ink` + `shadow-offset-xs`
  (see navbar search: also widens `w-48 → w-72` on focus).

## motion defaults

- Springs over easings for framer (`type: "spring"`, stiffness ~300–400).
- CSS transitions: `duration-150` for presses, `duration-200–300` for hovers.
- Keyframes available: `marquee`, `float`, `wiggle`, `spin` (slow variant
  token `animate-spin-slow`).
- Entrance animation is optional; **interaction feedback is mandatory** —
  everything clickable must visibly react on hover *and* active.

## charts (dashboard)

Single hue only (accent), sequential amber→brown ramp for the heatmap
(`#ffdfa8 → #f5b97e → #f59e52 → #c96f28`, empty = `#f2ede3`). Direct value
labels + native tooltips on every mark. No chart libraries — divs/SVG.

## copy voice

Playful, a little cheeky, always lowercase: "made for people who watch too
much", "psst… what are we watching tonight?", "no thinking required".
Never corporate ("Explore our catalog"), never shouty.

---

## checklist for any new UI

- [ ] lowercase renders everywhere? no `uppercase`, no all-caps literals?
- [ ] zero emoji / dingbats — Lucide icons only?
- [ ] no `tracking-wider` or arbitrary wide tracking?
- [ ] palette tokens only?
- [ ] interactive elements: `border-2 border-ink` + offset shadow + press mechanic?
- [ ] display headings: `text-offset` (or `-accent` at hero scale)?
- [ ] something rotated? something that wiggles/floats/springs on hover?
- [ ] empty, loading (skeleton), and error states designed?
- [ ] images reserve aspect ratio (no layout shift)?
- [ ] works with `prefers-reduced-motion`?
