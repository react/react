
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false
import {useCallback} from 'react';

function Component({propA, propB}) {
  return useCallback(() => {
    if (propA) {
      return {
        value: propB.x.y,
      };
    }
  }, [propA, propB.x.y]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{propA: 1, propB: {x: {y: []}}}],
};

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `propB`, but the source dependencies were [propA, propB.x.y]. Inferred less specific property than source.

error.hoist-useCallback-conditional-access-own-scope.ts:5:21
   3 |
   4 | function Component({propA, propB}) {
>  5 |   return useCallback(() => {
     |                      ^^^^^^^
>  6 |     if (propA) {
     | ^^^^^^^^^^^^^^^^
>  7 |       return {
     | ^^^^^^^^^^^^^^^^
>  8 |         value: propB.x.y,
     | ^^^^^^^^^^^^^^^^
>  9 |       };
     | ^^^^^^^^^^^^^^^^
> 10 |     }
     | ^^^^^^^^^^^^^^^^
> 11 |   }, [propA, propB.x.y]);
     | ^^^^ Could not preserve existing manual memoization
  12 | }
  13 |
  14 | export const FIXTURE_ENTRYPOINT = {
```
          
      