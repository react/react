
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import * as React from 'react';

function Component(options = {}) {
  const {skip} = options;

  const recreate = () => (skip ? undefined : {});

  let [observable, setObservable] = React.useState(
    options.skip ? null : recreate
  );

  const recreateRef = React.useRef(recreate);
  React.useLayoutEffect(() => {
    recreateRef.current = recreate;
  });

  if (!skip && !observable) {
    setObservable((observable = recreate()));
  }

  const restart = React.useCallback(() => {
    if (observable) {
      setObservable(recreateRef.current());
    }
  }, [observable]);

  return React.useMemo(() => ({restart}), [restart]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import * as React from "react";

function Component(t0) {
  const $ = _c(11);
  let t1;
  if ($[0] !== t0) {
    t1 = t0 === undefined ? {} : t0;
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const options = t1;
  const { skip } = options;
  let t2;
  if ($[2] !== skip) {
    t2 = () => (skip ? undefined : {});
    $[2] = skip;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const recreate = t2;

  const [t3, setObservable] = React.useState(options.skip ? null : recreate);
  let observable = t3;

  const recreateRef = React.useRef(recreate);
  let t4;
  if ($[4] !== recreate) {
    t4 = () => {
      recreateRef.current = recreate;
    };
    $[4] = recreate;
    $[5] = t4;
  } else {
    t4 = $[5];
  }
  React.useLayoutEffect(t4);

  if (!skip && !observable) {
    setObservable((observable = recreate()));
  }
  let t5;
  if ($[6] !== observable || $[7] !== setObservable) {
    t5 = () => {
      if (observable) {
        setObservable(recreateRef.current());
      }
    };
    $[6] = observable;
    $[7] = setObservable;
    $[8] = t5;
  } else {
    t5 = $[8];
  }

  observable;
  const restart = t5;
  let t6;
  if ($[9] !== restart) {
    t6 = { restart };
    $[9] = restart;
    $[10] = t6;
  } else {
    t6 = $[10];
  }
  return t6;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) {"restart":"[[ function params=0 ]]"}