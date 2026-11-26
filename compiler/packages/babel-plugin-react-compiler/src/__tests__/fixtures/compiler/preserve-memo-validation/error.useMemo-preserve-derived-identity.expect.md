
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

type Value = {
  id: number;
  label: string;
};

function getIdentity(value: Value): number {
  return value.id;
}

function Component({value}: {value: Value}) {
  const identity = getIdentity(value);
  const result = useMemo(() => value, [identity]);

  return <ValidateMemoization inputs={[identity]} output={result} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {id: 1, label: 'first'}}],
  sequentialRenders: [
    {value: {id: 1, label: 'first'}},
    {value: {id: 1, label: 'second'}},
    {value: {id: 2, label: 'third'}},
  ],
};

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `value`, but the source dependencies were [identity]. Inferred different dependency than source.

error.useMemo-preserve-derived-identity.ts:17:25
  15 | function Component({value}: {value: Value}) {
  16 |   const identity = getIdentity(value);
> 17 |   const result = useMemo(() => value, [identity]);
     |                          ^^^^^^^^^^^ Could not preserve existing manual memoization
  18 |
  19 |   return <ValidateMemoization inputs={[identity]} output={result} />;
  20 | }
```
          
      