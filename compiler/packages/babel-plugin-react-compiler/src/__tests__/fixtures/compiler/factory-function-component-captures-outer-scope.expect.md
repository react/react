
## Input

```javascript
// @compilationMode:"infer"
/**
 * Regression test for https://github.com/facebook/react/issues/34901
 *
 * When `infer` mode compiles a component defined inside an enclosing
 * function (e.g. a factory or HOC), inner callbacks that capture
 * variables from the enclosing scope must NOT be hoisted to module
 * scope by `outlineFunctions`. The enclosing scope's locals are
 * mis-tagged as `ModuleLocal` by `HIRBuilder` (it uses
 * `parentFunction.scope.parent` as a proxy for the module scope),
 * so `getCount`'s context appeared empty and outlining would emit a
 * top-level `_temp` function referencing an undefined `counter` at
 * runtime.
 */
function makeCounter(initialValue) {
  const counter = {value: initialValue};

  const Counter = () => {
    const getCount = () => counter.value;
    return <div>{getCount()}</div>;
  };

  return Counter;
}

const Counter = makeCounter(42);

export const FIXTURE_ENTRYPOINT = {
  fn: Counter,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer"
/**
 * Regression test for https://github.com/facebook/react/issues/34901
 *
 * When `infer` mode compiles a component defined inside an enclosing
 * function (e.g. a factory or HOC), inner callbacks that capture
 * variables from the enclosing scope must NOT be hoisted to module
 * scope by `outlineFunctions`. The enclosing scope's locals are
 * mis-tagged as `ModuleLocal` by `HIRBuilder` (it uses
 * `parentFunction.scope.parent` as a proxy for the module scope),
 * so `getCount`'s context appeared empty and outlining would emit a
 * top-level `_temp` function referencing an undefined `counter` at
 * runtime.
 */
function makeCounter(initialValue) {
  const counter = { value: initialValue };

  const Counter = () => {
    const $ = _c(1);
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      const getCount = () => counter.value;
      t0 = <div>{getCount()}</div>;
      $[0] = t0;
    } else {
      t0 = $[0];
    }
    return t0;
  };

  return Counter;
}

const Counter = makeCounter(42);

export const FIXTURE_ENTRYPOINT = {
  fn: Counter,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>42</div>