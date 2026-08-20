
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import {useCallback, useRef} from 'react';

function useCustomRef() {
  return useRef({click: () => {}});
}

function Foo() {
  const notaref = useCustomRef();

  const onClick = useCallback(() => {
    notaref.current?.click();
  }, []);

  return <button onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
  isComponent: true,
};

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `notaref.current`, but the source dependencies were []. Inferred dependency not present in source.

error.ref-like-name-not-a-ref.ts:11:30
   9 |   const notaref = useCustomRef();
  10 |
> 11 |   const onClick = useCallback(() => {
     |                               ^^^^^^^
> 12 |     notaref.current?.click();
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 13 |   }, []);
     | ^^^^ Could not preserve existing manual memoization
  14 |
  15 |   return <button onClick={onClick} />;
  16 | }
```
          
      