---
name: flow
description: Use when you need to run Flow type checking, or when seeing Flow type errors in React code.
---

# Flow Type Checking

Arguments:
- $ARGUMENTS: Renderer to check (default: dom-node)

## Renderers

| Renderer | When to Use |
|----------|-------------|
| `dom-node` | Default, recommended for most changes |
| `dom-browser` | Browser-specific DOM code |
| `native` | React Native |
| `fabric` | React Native Fabric |

## Instructions

1. Run `yarn flow $ARGUMENTS` (use `dom-node` if no argument)
2. Report type errors with file locations
3. For comprehensive checking (slow), use `yarn flow-ci`

## Common Mistakes

- **Running without a renderer** - Always specify or use default `dom-node`
- **Ignoring suppressions** - Check if `$FlowFixMe` comments are masking real issues
- **Missing type imports** - Ensure types are imported from the correct package
