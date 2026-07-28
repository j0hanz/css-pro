# Switcher — dev-only variant chrome

Reference for **Wire the switcher** step in [`SKILL.md`](SKILL.md). One shared component, both host shapes reuse — find wherever shared UI live in project.

## Wiring

Single switch on host route; host data fetching stay above it, only rendered subtree change per variant:

```tsx
// pseudo-code — adapt to the project's framework
const variant = searchParams.get('variant') ?? 'A';
return (
  <>
    {variant === 'A' && <VariantA {...data} />}
    {variant === 'B' && <VariantB {...data} />}
    {variant === 'C' && <VariantC {...data} />}
    <PrototypeSwitcher variants={['A', 'B', 'C']} current={variant} />
  </>
);
```

New-route shape mounts same switcher on its throwaway route.

## Bar anatomy

Small fixed-position bar, bottom-centre, three piece:

- **Left arrow** — cycle to previous variant, wraps around.
- **Variant label** — current key plus variant's exported name when it has one: `B — Sidebar layout`.
- **Right arrow** — cycle forward, wraps around.

## Behavior

- Arrow click updates URL search param through framework's router (`router.replace` on Next, `navigate` on React Router) — variant stays shareable, reload-stable.
- Keyboard: `←` and `→` also cycle. Never intercept arrow keys while `<input>`, `<textarea>`, or `[contenteditable]` focused.
- Visually distinct from page — high-contrast pill, subtle shadow — obviously not part of design being evaluated.
- Hidden in production builds: gate on `process.env.NODE_ENV !== 'production'` or project's equivalent, so stray prototype merge can't ship bar to users.
