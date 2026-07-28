---
name: motion-foundations
description: Use when naming a web-motion effect from a vague user description ("springy", "slides off", "draws itself in") or recalling how motion should feel. Not for deciding whether to animate an element (motion-craft).
---

# Motion Foundations

Knowledge you cite before build or judge motion. Two layers: glossary naming effects from how described, and physics of how motion should feel — chiefly Apple's _Designing Fluid Interfaces_ (WWDC 2018) and related talks, translated to web platform.

## Naming an effect

Users describe what they _see_ or _feel_ — "springy", "slides off", "draws itself in" — not technical name. Read intent behind description, map to glossary, return term. Quote glossary descriptions as-is; authoritative (e.g. a _Stagger_ entry reads "Animate several items one after another with a small delay between each, creating a cascade").

Several terms fit → best match first, then 1–2 alternates with one-line contrast. Two compete (Clip-path vs Mask, Pop in vs Bounce, Shared element transition vs Layout animation) → contrast so user pick. Nothing matches exactly → say so plainly, no invented term — still explain effect using glossary vocabulary ("that's a _stagger_ of _scale-in_ entrances"). Naming question want name, not essay; lead with term, expand only if asked.

Done = name returned as first word, ≤2 alternates only when genuinely competing, no invented terms.

Full reverse-lookup table: [`GLOSSARY.md`](GLOSSARY.md).

## How motion should feel

Physics of how motion should feel — gesture physics, springs, momentum, interruptibility, materials/depth, typography, reduced-motion three-signal model, design foundations behind interfaces that feel alive — open [`PHYSICS.md`](PHYSICS.md).
