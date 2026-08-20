
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';

function Component({propA}) {
  return useMemo(() => {
    return {
      value: propA.x().y,
    };
  }, [propA.x]);
}

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `propA`, but the source dependencies were [propA.x]. Inferred less specific property than source.

error.useMemo-property-call-chained-object.ts:5:17
   3 |
   4 | function Component({propA}) {
>  5 |   return useMemo(() => {
     |                  ^^^^^^^
>  6 |     return {
     | ^^^^^^^^^^^^
>  7 |       value: propA.x().y,
     | ^^^^^^^^^^^^
>  8 |     };
     | ^^^^^^^^^^^^
>  9 |   }, [propA.x]);
     | ^^^^ Could not preserve existing manual memoization
  10 | }
  11 |
```
          
      