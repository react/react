
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false

/**
 * Repro from https://github.com/facebook/react/issues/34262
 *
 * The compiler memoizes more precisely than the original code, with two reactive scopes:
 * - One for `transform(input)` with `input` as dep
 * - One for `{value}` with `value` as dep
 *
 * When we validate preserving manual memoization we incorrectly reject this, because
 * the original memoization had `object` depending on `input` but our scope depends on
 * `value`.
 *
 * This fixture adds a later potential mutation, which extends the scope and should
 * fail validation. This confirms that even though we allow the dependency to diverge,
 * we still check that the output value is memoized.
 */
function useInputValue(input) {
  const object = React.useMemo(() => {
    const {value} = transform(input);
    return {value};
  }, [input]);
  mutate(object);
  return object;
}

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This value was memoized in source but not in compilation output.

error.repro-preserve-memoization-inner-destructured-value-mistaken-as-dependency-later-mutation.ts:19:17
  17 |  */
  18 | function useInputValue(input) {
> 19 |   const object = React.useMemo(() => {
     |                  ^^^^^^^^^^^^^^^^^^^^^
> 20 |     const {value} = transform(input);
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 21 |     return {value};
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 22 |   }, [input]);
     | ^^^^^^^^^^^^^^ Could not preserve existing memoization
  23 |   mutate(object);
  24 |   return object;
  25 | }
```
          
      