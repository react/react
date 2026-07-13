
## Input

```javascript
// @enableNewMutationAliasingModel
import {CONST_TRUE, Stringify, mutate, useIdentity} from 'shared-runtime';

/**
 * Fixture showing an edge case for ReactiveScope variable propagation.
 * Fixed in the new inference model
 *
 * Found differences in evaluator results
 *   Non-forget (expected):
 *   <div>{"obj":{"inner":{"value":"hello"},"wat0":"joe"},"inner":["[[ cyclic ref *2 ]]"]}</div>
 *   <div>{"obj":{"inner":{"value":"hello"},"wat0":"joe"},"inner":["[[ cyclic ref *2 ]]"]}</div>
 *   Forget:
 *   <div>{"obj":{"inner":{"value":"hello"},"wat0":"joe"},"inner":["[[ cyclic ref *2 ]]"]}</div>
 *   [[ (exception in render) Error: invariant broken ]]
 *
 */
function Component() {
  const obj = CONST_TRUE ? {inner: {value: 'hello'}} : null;
  const boxedInner = [obj?.inner];
  useIdentity(null);
  mutate(obj);
  if (boxedInner[0] !== obj?.inner) {
    throw new Error('invariant broken');
  }
  return <Stringify obj={obj} inner={boxedInner} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{arg: 0}],
  sequentialRenders: [{arg: 0}, {arg: 1}],
};

```

## Code

```javascript
// @enableNewMutationAliasingModel
import { CONST_TRUE, Stringify, mutate, useIdentity } from "shared-runtime";

/**
 * Fixture showing an edge case for ReactiveScope variable propagation.
 * Fixed in the new inference model
 *
 * Found differences in evaluator results
 *   Non-forget (expected):
 *   <div>{"obj":{"inner":{"value":"hello"},"wat0":"joe"},"inner":["[[ cyclic ref *2 ]]"]}</div>
 *   <div>{"obj":{"inner":{"value":"hello"},"wat0":"joe"},"inner":["[[ cyclic ref *2 ]]"]}</div>
 *   Forget:
 *   <div>{"obj":{"inner":{"value":"hello"},"wat0":"joe"},"inner":["[[ cyclic ref *2 ]]"]}</div>
 *   [[ (exception in render) Error: invariant broken ]]
 *
 */
function Component() {
  const obj = CONST_TRUE ? { inner: { value: "hello" } } : null;
  const boxedInner = [obj?.inner];
  useIdentity(null);
  mutate(obj);
  if (boxedInner[0] !== obj?.inner) {
    throw new Error("invariant broken");
  }

  return <Stringify obj={obj} inner={boxedInner} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ arg: 0 }],
  sequentialRenders: [{ arg: 0 }, { arg: 1 }],
};

```
      
### Eval output
(kind: ok) <div>{"obj":{"inner":{"value":"hello"},"wat0":"joe"},"inner":["[[ cyclic ref *2 ]]"]}</div>
<div>{"obj":{"inner":{"value":"hello"},"wat0":"joe"},"inner":["[[ cyclic ref *2 ]]"]}</div>