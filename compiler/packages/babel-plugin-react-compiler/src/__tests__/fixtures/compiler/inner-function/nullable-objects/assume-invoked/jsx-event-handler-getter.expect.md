
## Input

```javascript
import {Stringify} from 'shared-runtime';

/**
 * Property loads can run getters with side effects (e.g. libraries that track
 * which values a component reads during render). A handler that is not invoked
 * during render must not cause its property loads to run during render.
 */
class Store {
  get value(): number {
    throw new Error('Store.value must not be read during render');
  }
}

function Component({store}: {store: Store}) {
  return <Stringify onClick={() => store.value} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{store: new Store()}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

/**
 * Property loads can run getters with side effects (e.g. libraries that track
 * which values a component reads during render). A handler that is not invoked
 * during render must not cause its property loads to run during render.
 */
class Store {
  get value(): number {
    throw new Error("Store.value must not be read during render");
  }
}

function Component(t0) {
  const $ = _c(2);
  const { store } = t0;
  let t1;
  if ($[0] !== store) {
    t1 = <Stringify onClick={() => store.value} />;
    $[0] = store;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ store: new Store() }],
};

```
      
### Eval output
(kind: ok) <div>{"onClick":"[[ function params=0 ]]"}</div>