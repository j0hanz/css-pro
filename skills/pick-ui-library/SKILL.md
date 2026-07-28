---
name: pick-ui-library
description: Use when choosing a frontend library for a specific task — "what library for charts/toasts/drag-and-drop/virtualization", "which package for X". React-ecosystem curated list, not generic "library" mentions.
---

# Picking The Right Library

## How to use this

1. **Identify the task**, not library user named. "I need to show a dropdown" is UI-primitives task (base-ui), even if they asked about something else.
2. **Check the framework.** List is React-ecosystem. `package.json` shows Vue, Svelte, Angular, or no framework — say the curated list doesn't apply, recommend from own knowledge, be clear you left the list. Framework-agnostic rows (shiki, Satori, clsx, Cobe) still fine anywhere.
3. **Check what's already installed.** Look at `package.json` first. Reuse installed dependency where it fits. If competitor installed (e.g. react-window instead of Virtuoso), flag better option but keep existing choice unless user asks to switch.
4. **Recommend one library**, state what it's for in one sentence, install/wire it up if part of request. Single answer when list has clear pick.
5. Task not covered by list? Say so explicitly, recommend from own knowledge — but be clear you left curated list.

## The list

### UI components & primitives

| Task                                                                    | Library                                                                                              |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Unstyled, accessible UI components (dialogs, popovers, menus, selects…) | [base-ui](https://base-ui.com)                                                                       |
| Command menus (⌘K palettes)                                             | [cmdk](https://cmdk.paco.me)                                                                         |
| Toasts / notifications                                                  | [Sonner](https://sonner.emilkowal.ski)                                                               |
| One-time password / verification code inputs                            | [input-otp](https://input-otp.rodz.dev)                                                              |
| Customizable GUIs / control panels                                      | [Leva](https://github.com/pmndrs/leva) — [dialkit](https://joshpuckett.me/dialkit) is an alternative |

### Motion & visuals

| Task                                                               | Library                                      |
| ------------------------------------------------------------------ | -------------------------------------------- |
| General-purpose animation (springs, layout animations, enter/exit) | [motion](https://motion.dev) (Framer Motion) |
| Animating numbers (counters, prices, stats)                        | [NumberFlow](https://number-flow.barvian.me) |
| Animated text components                                           | [torph](https://torph.lochie.me/)            |
| 3D globes                                                          | [Cobe](https://cobe.vercel.app)              |
| Dynamic OG images (HTML/CSS → SVG/PNG)                             | [Satori](https://github.com/vercel/satori)   |
| Syntax highlighting                                                | [shiki](https://shiki.style)                 |

Reach for motion only for springs, layout, exit, or gesture animations — plain CSS transitions for hovers/fades.

### Charts

| Task                                              | Library                                             |
| ------------------------------------------------- | --------------------------------------------------- |
| Real-time / streaming charts                      | [Liveline](https://github.com/benjitaylor/liveline) |
| General charts (static or interactive dashboards) | [recharts](https://recharts.org)                    |

### Interaction & performance

| Task                                      | Library                          |
| ----------------------------------------- | -------------------------------- |
| Drag and drop                             | [dnd kit](https://dndkit.com)    |
| Virtualization (long lists, large tables) | [Virtuoso](https://virtuoso.dev) |

### Styling helpers

| Task                                           | Library                                |
| ---------------------------------------------- | -------------------------------------- |
| Constructing `className` strings conditionally | [clsx](https://github.com/lukeed/clsx) |

clsx for ad-hoc conditional classes; variant styling uses plain CSS custom properties, not a variant library.

## Common mismatches to catch

If the user built it by hand (toasts, dropdowns, number animation, long lists, className ternaries), the table already has the pick.
