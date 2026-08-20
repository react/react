
## Input

```javascript
import {
  CONST_TRUE,
  identity,
  makeObject_Primitives,
  mutateAndReturn,
  useHook,
} from 'shared-runtime';

/**
 * value and `mutateAndReturn(value)` should end up in the same reactive scope.
 * (1) `value = makeObject` and `(temporary) = mutateAndReturn(value)` should be assigned
 * the same scope id (on their identifiers)
 * (2) alignScopesToBlockScopes should expand the scopes of both `(temporary) = identity(1)`
 * and `(temporary) = mutateAndReturn(value)` to the outermost value block boundaries
 * (3) mergeOverlappingScopes should merge the scopes of the above two instructions
 */
function Component({}) {
  const value = makeObject_Primitives();
  useHook();
  const mutatedValue =
    identity(1) && CONST_TRUE ? mutateAndReturn(value) : null;
  const result = [];
  useHook();
  result.push(value, mutatedValue);
  return result;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}, {}],
};

```

## Code

```javascript
import {
  CONST_TRUE,
  identity,
  makeObject_Primitives,
  mutateAndReturn,
  useHook,
} from "shared-runtime";

/**
 * value and `mutateAndReturn(value)` should end up in the same reactive scope.
 * (1) `value = makeObject` and `(temporary) = mutateAndReturn(value)` should be assigned
 * the same scope id (on their identifiers)
 * (2) alignScopesToBlockScopes should expand the scopes of both `(temporary) = identity(1)`
 * and `(temporary) = mutateAndReturn(value)` to the outermost value block boundaries
 * (3) mergeOverlappingScopes should merge the scopes of the above two instructions
 */
function Component(t0) {
  const value = makeObject_Primitives();
  useHook();
  const mutatedValue =
    identity(1) && CONST_TRUE ? mutateAndReturn(value) : null;
  const result = [];
  useHook();
  result.push(value, mutatedValue);
  return result;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}, {}],
};

```
      
### Eval output
(kind: ok) [{"a":0,"b":"value1","c":true,"wat0":"joe"},"[[ cyclic ref *1 ]]"]
[{"a":0,"b":"value1","c":true,"wat0":"joe"},"[[ cyclic ref *1 ]]"]
[{"a":0,"b":"value1","c":true,"wat0":"joe"},"[[ cyclic ref *1 ]]"]