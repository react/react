
## Input

```javascript
import {
  Stringify,
  makeObject_Primitives,
  mutateAndReturn,
} from 'shared-runtime';

/**
 * In this example, the `<Stringify ... />` JSX block mutates then captures obj.
 * As JSX expressions freeze their values, we know that `obj` and `myDiv` cannot
 * be mutated past this.
 * This set of mutable range + scopes is an edge case because the JSX expression
 * references values in two scopes.
 * - (freeze) the result of `mutateAndReturn`
 *   this is a mutable value with a mutable range starting at `makeObject()`
 * - (mutate) the lvalue storing the result of `<Stringify .../>`
 *   this is a immutable value and so gets assigned a different scope
 *
 * obj@0 = makeObj();                        ⌝ scope@0
 * if (cond) {                               |
 *   $1@0 = mutate(obj@0);                   |
 *   myDiv@1 = JSX $1@0          <- scope@1  |
 * }                                         ⌟
 *
 * Coincidentally, the range of `obj` is extended by alignScopesToBlocks to *past*
 * the end of the JSX instruction. As we currently alias identifier mutableRanges to
 * scope ranges, this `freeze` reference is perceived as occurring during the mutable
 * range of `obj` (even though it is after the last mutating reference).
 *
 * This case is technically safe as `myDiv` correctly takes `obj` as a dependency. As
 * a result, developers can never observe myDiv can aliasing a different value generation
 * than `obj` (e.g. the invariant `myDiv.props.value === obj` always holds).
 */
function useFoo({data}) {
  let obj = null;
  let myDiv = null;
  if (data.cond) {
    obj = makeObject_Primitives();
    if (data.cond1) {
      myDiv = <Stringify value={mutateAndReturn(obj)} />;
    }
  }
  return myDiv;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{data: {cond: true, cond1: true}}],
  sequentialRenders: [
    {data: {cond: true, cond1: true}},
    {data: {cond: true, cond1: true}},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import {
  Stringify,
  makeObject_Primitives,
  mutateAndReturn,
} from "shared-runtime";

/**
 * In this example, the `<Stringify ... />` JSX block mutates then captures obj.
 * As JSX expressions freeze their values, we know that `obj` and `myDiv` cannot
 * be mutated past this.
 * This set of mutable range + scopes is an edge case because the JSX expression
 * references values in two scopes.
 * - (freeze) the result of `mutateAndReturn`
 *   this is a mutable value with a mutable range starting at `makeObject()`
 * - (mutate) the lvalue storing the result of `<Stringify .../>`
 *   this is a immutable value and so gets assigned a different scope
 *
 * obj@0 = makeObj();                        ⌝ scope@0
 * if (cond) {                               |
 *   $1@0 = mutate(obj@0);                   |
 *   myDiv@1 = JSX $1@0          <- scope@1  |
 * }                                         ⌟
 *
 * Coincidentally, the range of `obj` is extended by alignScopesToBlocks to *past*
 * the end of the JSX instruction. As we currently alias identifier mutableRanges to
 * scope ranges, this `freeze` reference is perceived as occurring during the mutable
 * range of `obj` (even though it is after the last mutating reference).
 *
 * This case is technically safe as `myDiv` correctly takes `obj` as a dependency. As
 * a result, developers can never observe myDiv can aliasing a different value generation
 * than `obj` (e.g. the invariant `myDiv.props.value === obj` always holds).
 */
function useFoo(t0) {
  const $ = _c(3);
  const { data } = t0;
  let obj;
  let myDiv = null;
  if (data.cond) {
    if ($[0] !== data.cond1) {
      obj = makeObject_Primitives();
      if (data.cond1) {
        myDiv = <Stringify value={mutateAndReturn(obj)} />;
      }
      $[0] = data.cond1;
      $[1] = obj;
      $[2] = myDiv;
    } else {
      obj = $[1];
      myDiv = $[2];
    }
  }

  return myDiv;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ data: { cond: true, cond1: true } }],
  sequentialRenders: [
    { data: { cond: true, cond1: true } },
    { data: { cond: true, cond1: true } },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"value":{"a":0,"b":"value1","c":true,"wat0":"joe"}}</div>
<div>{"value":{"a":0,"b":"value1","c":true,"wat0":"joe"}}</div>