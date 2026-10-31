
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
  const alias = value;
  const identity = getIdentity(value);
  const result = useMemo(() => alias.label, [identity]);

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

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `alias.label`, but the source dependencies were [identity]. Inferred different dependency than source.

error.useMemo-preserve-derived-property-identity.ts:18:25
  16 |   const alias = value;
  17 |   const identity = getIdentity(value);
> 18 |   const result = useMemo(() => alias.label, [identity]);
     |                          ^^^^^^^^^^^^^^^^^ Could not preserve existing manual memoization
  19 |
  20 |   return <ValidateMemoization inputs={[identity]} output={result} />;
  21 | }
```
          
      