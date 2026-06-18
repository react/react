
## Input

```javascript
// @compilationMode:"infer"
import {useIdentity} from 'shared-runtime';
import {Stringify} from 'shared-runtime';

const store = {value: 'hello'};

function createSomething() {
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

const store = { value: "hello" };

function createSomething() {
  const Cmp = () => {
    const $ = _c(4);
    const getStore = useIdentity(_temp);
    let t0;
    if ($[0] !== getStore) {
      t0 = getStore();
      $[0] = getStore;
      $[1] = t0;
    } else {
      t0 = $[1];
    }
    let t1;
    if ($[2] !== t0) {
      t1 = <Stringify result={t0} />;
      $[2] = t0;
      $[3] = t1;
    } else {
      t1 = $[3];
    }
    return t1;
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
function _temp() {
  return store;
}

```
      
### Eval output
(kind: ok) <div>{"result":{"value":"hello"}}</div>