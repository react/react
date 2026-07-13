
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies

import {useMemo} from 'react';
import {identity, ValidateMemoization} from 'shared-runtime';

function Component({x}) {
  const object = useMemo(() => {
    return identity({
      callback: () => {
        // This is a bug in our dependency inference: we stop capturing dependencies
        // after x.a.b?.c. But what this dependency is telling us is that if `x.a.b`
        // was non-nullish, then we can access `.c.d?.e`. Thus we should take the
        // full property chain, exactly as-is with optionals/non-optionals, as a
        // dependency
        return identity(x.a.b?.c.d?.e);
      },
    });
  }, [x.a.b?.c.d?.e]);
  const result = useMemo(() => {
    return [object.callback()];
  }, [object]);
  return <Inner x={x} result={result} />;
}

function Inner({x, result}) {
  'use no memo';
  return <ValidateMemoization inputs={[x.y.z]} output={result} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: {y: {z: 42}}}],
  sequentialRenders: [
    {x: {y: {z: 42}}},
    {x: {y: {z: 42}}},
    {x: {y: {z: 3.14}}},
    {x: {y: {z: 42}}},
    {x: {y: {z: 3.14}}},
    {x: {y: {z: 42}}},
  ],
};

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `x.a.b?.c`, but the source dependencies were [x.a.b?.c.d?.e]. Inferred less specific property than source.

error.todo-preserve-memo-deps-mixed-optional-nonoptional-property-chain.ts:7:25
   5 |
   6 | function Component({x}) {
>  7 |   const object = useMemo(() => {
     |                          ^^^^^^^
>  8 |     return identity({
     | ^^^^^^^^^^^^^^^^^^^^^
>  9 |       callback: () => {
     …
     | ^^^^^^^^^^^^^^^^^^^^^
> 17 |     });
     | ^^^^^^^^^^^^^^^^^^^^^
> 18 |   }, [x.a.b?.c.d?.e]);
     | ^^^^ Could not preserve existing manual memoization
  19 |   const result = useMemo(() => {
  20 |     return [object.callback()];
  21 |   }, [object]);
```
          
      