
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false
import {Stringify, identity, makeArray, toJSON} from 'shared-runtime';
import {useMemo} from 'react';

function Component(props) {
  const propsString = useMemo(() => toJSON(props), [props]);
  if (propsString.length <= 2) {
    return null;
  }

  const linkProps = {
    url: identity(propsString),
  };
  const x = {};

  // reactive scope ends at makeArray, as it is inferred as maybeMutate
  return (
    <Stringify
      link={linkProps}
      val1={[1]}
      val2={[2]}
      val3={[3]}
      val4={[4]}
      val5={[5]}>
      {makeArray(x, 2)}
    </Stringify>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{val: 2}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees:false
import { Stringify, identity, makeArray, toJSON } from "shared-runtime";
import { useMemo } from "react";

function Component(props) {
  const $ = _c(10);
  let t0;
  let t1;
  if ($[0] !== props) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const propsString = toJSON(props);
      if (propsString.length <= 2) {
        t1 = null;
        break bb0;
      }
      t0 = identity(propsString);
    }
    $[0] = props;
    $[1] = t0;
    $[2] = t1;
  } else {
    t0 = $[1];
    t1 = $[2];
  }
  if (t1 !== Symbol.for("react.early_return_sentinel")) {
    return t1;
  }
  let t2;
  if ($[3] !== t0) {
    const linkProps = { url: t0 };
    const x = {};
    let t3;
    let t4;
    let t5;
    let t6;
    let t7;
    if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
      t3 = [1];
      t4 = [2];
      t5 = [3];
      t6 = [4];
      t7 = [5];
      $[5] = t3;
      $[6] = t4;
      $[7] = t5;
      $[8] = t6;
      $[9] = t7;
    } else {
      t3 = $[5];
      t4 = $[6];
      t5 = $[7];
      t6 = $[8];
      t7 = $[9];
    }
    t2 = (
      <Stringify
        link={linkProps}
        val1={t3}
        val2={t4}
        val3={t5}
        val4={t6}
        val5={t7}
      >
        {makeArray(x, 2)}
      </Stringify>
    );
    $[3] = t0;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ val: 2 }],
};

```
      
### Eval output
(kind: ok) <div>{"link":{"url":"{\"val\":2}"},"val1":[1],"val2":[2],"val3":[3],"val4":[4],"val5":[5],"children":[{},2]}</div>