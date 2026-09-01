---
name: test
description: Use when you need to run tests for React core. Supports source, www, stable, and experimental channels.
---

Run tests for the React codebase.

Arguments:
- $ARGUMENTS: Channel, flags, and test pattern

Usage Examples:
- `/test ReactFiberHooks` - Run with source channel (default)
- `/test experimental ReactFiberHooks` - Run with experimental channel
- `/test www ReactFiberHooks` - Run with www-modern channel
- `/test www variant false ReactFiberHooks` - Test __VARIANT__=false
- `/test stable ReactFiberHooks` - Run with stable channel
- `/test classic ReactFiberHooks` - Run with www-classic channel
- `/test watch ReactFiberHooks` - Run in watch mode (TDD)

Release Channels:
- `(default)` - Source/canary channel, uses ReactFeatureFlags.js defaults
- `experimental` - Source/experimental channel with __EXPERIMENTAL__ flags = true
- `www` - www-modern channel with __VARIANT__ flags = true
- `www variant false` - www channel with __VARIANT__ flags = false
- `stable` - What ships to npm
- `classic` - Legacy www-classic (rarely needed)

Instructions:
1. Parse channel from arguments (default: source)
2. Map to yarn command:
   - (default) → `yarn test --silent --no-watchman <pattern>`
   - experimental → `yarn test -r=experimental --silent --no-watchman <pattern>`
   - stable → `yarn test-stable --silent --no-watchman <pattern>`
   - classic → `yarn test-classic --silent --no-watchman <pattern>`
   - www → `yarn test-www --silent --no-watchman <pattern>`
   - www variant false → `yarn test-www --variant=false --silent --no-watchman <pattern>`
3. Report test results and any failures

Hard Rules:
1. **Use --silent to see failures** - This limits the test output to only failures.
2. **Use --no-watchman** - This is a common failure in sandboxing.

Common Mistakes:
- **Running without a pattern** - Runs ALL tests, very slow. Always specify a pattern.
- **Forgetting both www variants** - Test `www` AND `www variant false` for `__VARIANT__` flags.
- **Test skipped unexpectedly** - Check for `@gate` pragma; see `feature-flags` skill.
