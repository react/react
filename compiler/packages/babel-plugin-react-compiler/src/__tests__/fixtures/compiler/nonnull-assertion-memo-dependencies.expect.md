
## Input

```javascript
import {useMemo} from 'react';
import {Stringify} from 'shared-runtime';

function Component({data}: {data: {id: number}}) {
  const assertedDependency = useMemo(() => data.id, [data!.id]);
  const assertedCallback = useMemo(() => data!.id, [data.id]);
  const repeatedAssertions = useMemo(() => data!!.id, [data!!.id]);
  return (
    <Stringify
      assertedDependency={assertedDependency}
      assertedCallback={assertedCallback}
      repeatedAssertions={repeatedAssertions}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: {id: 1}}],
  sequentialRenders: [{data: {id: 1}}, {data: {id: 2}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useMemo } from "react";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(4);
  const { data } = t0;
  const assertedDependency = data.id;
  const assertedCallback = data!.id;
  const repeatedAssertions = data!!.id;
  let t1;
  if (
    $[0] !== assertedCallback ||
    $[1] !== assertedDependency ||
    $[2] !== repeatedAssertions
  ) {
    t1 = (
      <Stringify
        assertedDependency={assertedDependency}
        assertedCallback={assertedCallback}
        repeatedAssertions={repeatedAssertions}
      />
    );
    $[0] = assertedCallback;
    $[1] = assertedDependency;
    $[2] = repeatedAssertions;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ data: { id: 1 } }],
  sequentialRenders: [{ data: { id: 1 } }, { data: { id: 2 } }],
};

```
      
### Eval output
(kind: ok) <div>{"assertedDependency":1,"assertedCallback":1,"repeatedAssertions":1}</div>
<div>{"assertedDependency":2,"assertedCallback":2,"repeatedAssertions":2}</div>