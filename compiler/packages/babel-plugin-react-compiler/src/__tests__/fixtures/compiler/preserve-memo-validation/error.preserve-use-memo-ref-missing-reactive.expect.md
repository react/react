
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import {useCallback, useRef} from 'react';

function useFoo({cond}) {
  const ref1 = useRef<undefined | (() => undefined)>();
  const ref2 = useRef<undefined | (() => undefined)>();
  const ref = cond ? ref1 : ref2;

  return useCallback(() => {
    if (ref != null) {
      ref.current();
    }
  }, []);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `ref`, but the source dependencies were []. Inferred dependency not present in source.

error.preserve-use-memo-ref-missing-reactive.ts:9:21
   7 |   const ref = cond ? ref1 : ref2;
   8 |
>  9 |   return useCallback(() => {
     |                      ^^^^^^^
> 10 |     if (ref != null) {
     | ^^^^^^^^^^^^^^^^^^^^^^
> 11 |       ref.current();
     | ^^^^^^^^^^^^^^^^^^^^^^
> 12 |     }
     | ^^^^^^^^^^^^^^^^^^^^^^
> 13 |   }, []);
     | ^^^^ Could not preserve existing manual memoization
  14 | }
  15 |
  16 | export const FIXTURE_ENTRYPOINT = {
```
          
      