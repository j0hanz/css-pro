---
name: prototype
description: Use when the user wants to see options before committing — "try a few layouts", "show me alternatives", "which direction?" — or a design call is too close to judge on paper. For one committed direction built directly, use designer.
---

# Prototype

Prototype = throwaway code: build directions as **variants** on real **host**, cycle with **switcher**, hunt **wallpaper** — then keep one.

Four **leading words** anchor work:

- **variant** — one complete direction: own layout, own information hierarchy, own primary affordance. Unit of comparison.
- **host** — real page or route variants mount in, with real header, data, density. Judging surface.
- **switcher** — floating bar cycling variants via `?variant=` URL param. Dev-only chrome, never part of design judged.
- **wallpaper** — enemy. Variants differing only in color or copy — that's a tweak, not prototype. Real variants disagree on structure. Hunt it.

## 1. Name the question and the host

Write question one line at top of prototype file — "Three variants of settings page, switchable via `?variant=`, on existing `/settings` route." Pick N: default **3**, cap **5** — beyond that variants stop being radically different, start being noise.

Pick host. Variant judged against rest of app — real header, real data, real density.

- **Existing page** (default) — route exists, or thing prototyped would naturally live inside one (new dashboard section, new card on settings, new step in existing flow). Mount variants there; existing data fetching, params, auth stay — only rendering swaps.
- **New throwaway route** (last resort) — genuinely no home: new top-level surface, flow embeddable nowhere. Follow project's existing routing convention, never invent new top-level structure; name so casual reader sees prototype, not production — word `prototype` in path or filename. Before committing here, sanity-check: really no existing page to embed in?

**Done when** question written as one line at prototype top, N picked, host named — existing page unless genuinely none fits.

## 2. Draft variants as directions

Each variant is `designer` in miniature — same subject, audience, page job (its Ground step), different free axis spent. Hold each to:

- Page's purpose and data host actually has — no lorem ipsum.
- Project's existing styling system and tokens — extend, never invent parallel system.
- Clear exported name: `VariantA`, `VariantB`, `VariantC`.

Structurally different means different layout, different hierarchy, different primary affordance. Check two ways: each variant against template defaults, and variants against each other; three-equal-card grids across all drafts is **wallpaper**. Two drafts converge — redo one with explicit constraint ("do not use a card grid").

Skip polish — prototype constraint, see step 5. Never wire variant to real mutation — point at stub; question is "what should this look like", not "does backend work".

**Done when** N variants drafted, each structurally distinct from defaults and from each other, all reading host's real data, none mutating.

## 3. Wire the switcher

One switcher on host route: render variant matching `?variant=`, first as default; host's data fetching stays above switch — only rendered subtree changes per variant. Bar anatomy, keyboard cycling, URL behavior, production gating, reference implementation: open [`SWITCHER.md`](SWITCHER.md).

**Done when** every variant reachable and reload-stable by URL param, arrows and `←`/`→` cycle, switcher gated out of production builds.

## 4. Hand over

Surface URL and variant keys; user flips through when they get to it. Most valuable feedback usually hybrid — "header from B with sidebar from C" — that's actual design wanted: treat as new winning variant, not annoyance.

**Done when** URL and keys reported.

## 5. Capture and strip

Winner picked (or hybrid assembled): capture answer — which variant, why, what question it settled — in issue or commit. Fold winner into real code through `designer`'s Build and Land steps: variant written under prototype constraints (no tests, minimal error handling), so rewrite to **floor**, never promote as-is; write its CSS per `css-craft`.

Full variant set is primary source — commit to throwaway branch, out of main, leave pointer to branch on implementation issue. Main keeps only validated decision: losing variants and switcher left in main rot fast, confuse next reader.

**Done when** winner rebuilt to `designer` floor, answer and variant set captured off main, main clear of losing variants and switcher.
