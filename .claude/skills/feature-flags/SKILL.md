---
name: feature-flags
description: Use when feature flag tests fail, flags need updating, understanding @gate pragmas, debugging channel-specific test failures, or adding new flags to React.
---

# React Feature Flags

## Flag Files

| File | Purpose |
|------|---------|
| `packages/shared/ReactFeatureFlags.js` | Default flags (canary), `__EXPERIMENTAL__` overrides |
| `packages/shared/forks/ReactFeatureFlags.www.js` | www channel, `__VARIANT__` overrides |
| `packages/shared/forks/ReactFeatureFlags.native-fb.js` | React Native, `__VARIANT__` overrides |
| `packages/shared/forks/ReactFeatureFlags.test-renderer.js` | Test renderer |

## Gating Tests

### `@gate` pragma (test-level)

Use when the feature is completely unavailable without the flag:

```javascript
// @gate enableViewTransition
it('supports view transitions', () => {
  // This test only runs when enableViewTransition is true
  // and is SKIPPED (not failed) when false
});
```

### `gate()` inline (assertion-level)

Use when the feature exists but behavior differs based on flag:

```javascript
it('renders component', async () => {
  await act(() => root.render(<App />));

  if (gate(flags => flags.enableNewBehavior)) {
    expect(container.textContent).toBe('new output');
  } else {
    expect(container.textContent).toBe('legacy output');
  }
});
```

## Adding a New Flag

1. Add to `ReactFeatureFlags.js` with default value
2. Add to each fork file (`*.www.js`, `*.native-fb.js`, etc.)
3. If it should vary in www/RN, set to `__VARIANT__` in the fork file
4. Gate tests with `@gate flagName` or inline `gate()`

## Checking Flag States

Use `/flags` to view states across channels. See the `flags` skill for full command options.

## `__VARIANT__` Flags (GKs)

Flags set to `__VARIANT__` simulate gatekeepers - tested twice (true and false):

```bash
/test www <pattern>              # __VARIANT__ = true
/test www variant false <pattern> # __VARIANT__ = false
```

## Debugging Channel-Specific Failures

1. Run `/flags --diff <channel1> <channel2>` to compare values
2. Check `@gate` conditions - test may be gated to specific channels
3. Run `/test <channel> <pattern>` to isolate the failure
4. Verify flag exists in all fork files if newly added

## Common Mistakes

- **Forgetting both variants** - Always test `www` AND `www variant false` for `__VARIANT__` flags
- **Using @gate for behavior differences** - Use inline `gate()` if both paths should run
- **Missing fork files** - New flags must be added to ALL fork files, not just the main one
- **Wrong gate syntax** - It's `gate(flags => flags.name)`, not `gate('name')`
