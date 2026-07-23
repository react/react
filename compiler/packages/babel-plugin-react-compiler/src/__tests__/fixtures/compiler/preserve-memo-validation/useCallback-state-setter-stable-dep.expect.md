
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useCallback, useState} from 'react';

/**
 * State setters (and other stable values like dispatch) must not be required
 * in manual dependency arrays. The compiler should not reject a component
 * because its useCallback omits a state setter from its deps list, since
 * state setters are guaranteed stable across renders.
 *
 * Regression test for: Compiler requires state setter to be added to
 * dependency array (github.com/facebook/react/issues/36384)
 */
function Component({data}: {data: Array<string>}) {
  const [processed, setProcessed] = useState<Array<string>>([]);
  const [count, setCount] = useState(0);

  const handleProcess = useCallback(async () => {
    const result = data.map(d => d.trim());
    setProcessed(prev => [...prev, ...result]);
    setCount(c => c + 1);
  }, [data]);

  return (
    <div>
      <button onClick={handleProcess}>Process</button>
      <span>{count}</span>
      {processed.map((p, i) => (
        <div key={i}>{p}</div>
      ))}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: ['hello ', ' world']}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useCallback, useState } from "react";

/**
 * State setters (and other stable values like dispatch) must not be required
 * in manual dependency arrays. The compiler should not reject a component
 * because its useCallback omits a state setter from its deps list, since
 * state setters are guaranteed stable across renders.
 *
 * Regression test for: Compiler requires state setter to be added to
 * dependency array (github.com/facebook/react/issues/36384)
 */
function Component(t0) {
  const $ = _c(13);
  const { data } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = [];
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  const [processed, setProcessed] = useState(t1);
  const [count, setCount] = useState(0);
  let t2;
  if ($[1] !== data) {
    t2 = async () => {
      const result = data.map(_temp);
      setProcessed((prev) => [...prev, ...result]);
      setCount(_temp2);
    };
    $[1] = data;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  const handleProcess = t2;
  let t3;
  if ($[3] !== handleProcess) {
    t3 = <button onClick={handleProcess}>Process</button>;
    $[3] = handleProcess;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  let t4;
  if ($[5] !== count) {
    t4 = <span>{count}</span>;
    $[5] = count;
    $[6] = t4;
  } else {
    t4 = $[6];
  }
  let t5;
  if ($[7] !== processed) {
    t5 = processed.map(_temp3);
    $[7] = processed;
    $[8] = t5;
  } else {
    t5 = $[8];
  }
  let t6;
  if ($[9] !== t3 || $[10] !== t4 || $[11] !== t5) {
    t6 = (
      <div>
        {t3}
        {t4}
        {t5}
      </div>
    );
    $[9] = t3;
    $[10] = t4;
    $[11] = t5;
    $[12] = t6;
  } else {
    t6 = $[12];
  }
  return t6;
}
function _temp3(p, i) {
  return <div key={i}>{p}</div>;
}
function _temp2(c) {
  return c + 1;
}
function _temp(d) {
  return d.trim();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ data: ["hello ", " world"] }],
};

```
      
### Eval output
(kind: ok) <div><button>Process</button><span>0</span></div>