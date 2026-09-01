
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

// This is technically a false positive, but source is already breaking
// `exhaustive-deps` lint rule (and can be considered invalid).
function useHook(x) {
  const aliasedX = x;
  const aliasedProp = x.y.z;

  return useCallback(() => [aliasedX, x.y.z], [x, aliasedProp]);
}

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `aliasedX`, but the source dependencies were [x, aliasedProp]. Inferred different dependency than source.

error.useCallback-aliased-var.ts:9:21
   7 |   const aliasedProp = x.y.z;
   8 |
>  9 |   return useCallback(() => [aliasedX, x.y.z], [x, aliasedProp]);
     |                      ^^^^^^^^^^^^^^^^^^^^^^^ Could not preserve existing manual memoization
  10 | }
  11 |
```
          
      