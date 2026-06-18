
## Input

```javascript
// @compilationMode:"infer"
import {useIdentity} from 'shared-runtime';
import {Stringify} from 'shared-runtime';

function createSomething() {
  const store = {value: 'hello'};
  const Cmp = () => {
    const getStore = useIdentity(() => store);
    return <Stringify result={getStore()} />;
  };
  return Cmp;
}

const Thing = createSomething();

function Component() {
  return <Thing />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer"
import { useIdentity } from "shared-runtime";
import { Stringify } from "shared-runtime";

function createSomething() {
  const store = { value: "hello" };
  const Cmp = () => {
    const $ = _c(5);
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      t0 = () => store;
      $[0] = t0;
    } else {
      t0 = $[0];
    }
    const getStore = useIdentity(t0);
    let t1;
    if ($[1] !== getStore) {
      t1 = getStore();
      $[1] = getStore;
      $[2] = t1;
    } else {
      t1 = $[2];
    }
    let t2;
    if ($[3] !== t1) {
      t2 = <Stringify result={t1} />;
      $[3] = t1;
      $[4] = t2;
    } else {
      t2 = $[4];
    }
    return t2;
  };

  return Cmp;
}

const Thing = createSomething();

function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <Thing />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>{"result":{"value":"hello"}}</div>