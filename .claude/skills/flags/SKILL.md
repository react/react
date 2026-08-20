---
name: flags
description: Use when you need to check feature flag states, compare channels, or debug why a feature behaves differently across release channels.
---

# Feature Flags

Arguments:
- $ARGUMENTS: Optional flags

## Options

| Option | Purpose |
|--------|---------|
| (none) | Show all flags across all channels |
| `--diff <ch1> <ch2>` | Compare flags between channels |
| `--cleanup` | Show flags grouped by cleanup status |
| `--csv` | Output in CSV format |

## Channels

- `www`, `www-modern` - Meta internal
- `canary`, `next`, `experimental` - OSS channels
- `rn`, `rn-fb`, `rn-next` - React Native

## Legend

✅ enabled, ❌ disabled, 🧪 `__VARIANT__`, 📊 profiling-only

## Instructions

1. Run `yarn flags $ARGUMENTS`
2. Explain the output to the user
3. For --diff, highlight meaningful differences

## Common Mistakes

- **Forgetting `__VARIANT__` flags** - These are tested both ways in www; check both variants
- **Comparing wrong channels** - Use `--diff` to see exact differences
