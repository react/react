
## Input

```javascript
// @validateNoSetStateInRender @enableUseKeyedState
import {useState} from 'react';

function Component() {
  const [total, setTotal] = useState(0);
  setTotal(42);
  return total;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: true,
};

```


## Error

```
Found 1 error:

Error: Cannot call setState during render

Calling setState during render may trigger an infinite loop.
* To reset state when other state/props change, use `const [state, setState] = useKeyedState(initialState, key)` to reset `state` when `key` changes.
* To derive data from other state/props, compute the derived data during render without using state.

error.invalid-setstate-unconditional-with-keyed-state.ts:6:2
  4 | function Component() {
  5 |   const [total, setTotal] = useState(0);
> 6 |   setTotal(42);
    |   ^^^^^^^^ Found setState() in render
  7 |   return total;
  8 | }
  9 |
```
          
      