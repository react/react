
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false
import {useMemo} from 'react';
import {identity, mutate} from 'shared-runtime';

function Component({propA, propB}) {
  return useMemo(() => {
    const x = {};
    if (identity(null) ?? propA.a) {
      mutate(x);
      return {
        value: propB.x.y,
      };
    }
  }, [propA.a, propB.x.y]);
}

```


## Error

```
Found 2 errors:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `propA`, but the source dependencies were [propA.a, propB.x.y]. Inferred less specific property than source.

error.useMemo-infer-less-specific-conditional-value-block.ts:6:17
   4 |
   5 | function Component({propA, propB}) {
>  6 |   return useMemo(() => {
     |                  ^^^^^^^
>  7 |     const x = {};
     | ^^^^^^^^^^^^^^^^^
>  8 |     if (identity(null) ?? propA.a) {
     | ^^^^^^^^^^^^^^^^^
>  9 |       mutate(x);
     | ^^^^^^^^^^^^^^^^^
> 10 |       return {
     | ^^^^^^^^^^^^^^^^^
> 11 |         value: propB.x.y,
     | ^^^^^^^^^^^^^^^^^
> 12 |       };
     | ^^^^^^^^^^^^^^^^^
> 13 |     }
     | ^^^^^^^^^^^^^^^^^
> 14 |   }, [propA.a, propB.x.y]);
     | ^^^^ Could not preserve existing manual memoization
  15 | }
  16 |

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `propB`, but the source dependencies were [propA.a, propB.x.y]. Inferred less specific property than source.

error.useMemo-infer-less-specific-conditional-value-block.ts:6:17
   4 |
   5 | function Component({propA, propB}) {
>  6 |   return useMemo(() => {
     |                  ^^^^^^^
>  7 |     const x = {};
     | ^^^^^^^^^^^^^^^^^
>  8 |     if (identity(null) ?? propA.a) {
     | ^^^^^^^^^^^^^^^^^
>  9 |       mutate(x);
     | ^^^^^^^^^^^^^^^^^
> 10 |       return {
     | ^^^^^^^^^^^^^^^^^
> 11 |         value: propB.x.y,
     | ^^^^^^^^^^^^^^^^^
> 12 |       };
     | ^^^^^^^^^^^^^^^^^
> 13 |     }
     | ^^^^^^^^^^^^^^^^^
> 14 |   }, [propA.a, propB.x.y]);
     | ^^^^ Could not preserve existing manual memoization
  15 | }
  16 |
```
          
      