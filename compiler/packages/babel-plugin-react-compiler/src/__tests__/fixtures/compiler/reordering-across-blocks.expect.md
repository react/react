
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({config}) {
  /**
   * The original memoization is optimal in the sense that it has
   * one output (the object) and one dependency (`config`). Both
   * the `a` and `b` functions will have to be recreated whenever
   * `config` changes, cascading to update the object.
   *
   * However, we currently only consider consecutive scopes for
   * merging, so we first see the `a` scope, then the `b` scope,
   * and see that the output of the `a` scope is used later -
   * so we don't merge these scopes, and so on.
   *
   * The more optimal thing would be to build a dependency graph
   * of scopes so that we can see the data flow is along the lines
   * of:
   *
   *             config
   *            /      \
   *          [a]      [b]
   *           \       /
   *           [object]
   *
   * All the scopes (shown in []) are transitively dependent on
   * `config`, so they can be merged.
   */
  const object = useMemo(() => {
    const a = event => {
      config?.onA?.(event);
    };

    const b = event => {
      config?.onB?.(event);
    };

    return {
      b,
      a,
    };
  }, [config]);

  return <Stringify value={object} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(9);
  const { config } = t0;
  let t1;
  if ($[0] !== config) {
    t1 = (event) => {
      config?.onA?.(event);
    };
    $[0] = config;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const a = t1;
  let t2;
  if ($[2] !== config) {
    t2 = (event_0) => {
      config?.onB?.(event_0);
    };
    $[2] = config;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const b = t2;
  let t3;
  if ($[4] !== a || $[5] !== b) {
    t3 = { b, a };
    $[4] = a;
    $[5] = b;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  const object = t3;
  let t4;
  if ($[7] !== object) {
    t4 = <Stringify value={object} />;
    $[7] = object;
    $[8] = t4;
  } else {
    t4 = $[8];
  }
  return t4;
}

```
      
### Eval output
(kind: exception) Fixture not implemented