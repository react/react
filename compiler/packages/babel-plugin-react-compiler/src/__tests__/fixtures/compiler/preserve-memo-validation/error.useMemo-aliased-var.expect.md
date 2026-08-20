
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

// This is technically a false positive, but source is already breaking
// `exhaustive-deps` lint rule (and can be considered invalid).
function useHook(x) {
  const aliasedX = x;
  const aliasedProp = x.y.z;

  return useMemo(() => [x, x.y.z], [aliasedX, aliasedProp]);
}

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `x`, but the source dependencies were [aliasedX, aliasedProp]. Inferred different dependency than source.

error.useMemo-aliased-var.ts:9:17
   7 |   const aliasedProp = x.y.z;
   8 |
>  9 |   return useMemo(() => [x, x.y.z], [aliasedX, aliasedProp]);
     |                  ^^^^^^^^^^^^^^^^ Could not preserve existing manual memoization
  10 | }
  11 |
```
          
      