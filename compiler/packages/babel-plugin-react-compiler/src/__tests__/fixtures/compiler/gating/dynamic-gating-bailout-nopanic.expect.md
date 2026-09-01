
## Input

```javascript
// @dynamicGating:{"source":"shared-runtime"} @validatePreserveExistingMemoizationGuarantees @panicThreshold:"none" @loggerTestOnly @validateExhaustiveMemoizationDependencies:false

import {useMemo} from 'react';
import {identity} from 'shared-runtime';

function Foo({value}) {
  'use memo if(getTrue)';

  const initialValue = useMemo(() => identity(value), []);
  return (
    <>
      <div>initial value {initialValue}</div>
      <div>current value {value}</div>
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{value: 1}],
  sequentialRenders: [{value: 1}, {value: 2}],
};

```

## Code

```javascript
// @dynamicGating:{"source":"shared-runtime"} @validatePreserveExistingMemoizationGuarantees @panicThreshold:"none" @loggerTestOnly @validateExhaustiveMemoizationDependencies:false

import { useMemo } from "react";
import { identity } from "shared-runtime";

function Foo({ value }) {
  "use memo if(getTrue)";

  const initialValue = useMemo(() => identity(value), []);
  return (
    <>
      <div>initial value {initialValue}</div>
      <div>current value {value}</div>
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ value: 1 }],
  sequentialRenders: [{ value: 1 }, { value: 2 }],
};

```

## Logs

```
{"kind":"CompileError","fnLoc":{"start":{"line":6,"column":0,"index":255},"end":{"line":16,"column":1,"index":482},"filename":"dynamic-gating-bailout-nopanic.ts"},"detail":{"category":"PreserveManualMemo","reason":"Existing memoization could not be preserved","description":"React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `value`, but the source dependencies were []. Inferred dependency not present in source","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":9,"column":31,"index":337},"end":{"line":9,"column":52,"index":358},"filename":"dynamic-gating-bailout-nopanic.ts"},"message":"Could not preserve existing manual memoization"}]}}
```
      
### Eval output
(kind: ok) <div>initial value 1</div><div>current value 1</div>
<div>initial value 1</div><div>current value 2</div>