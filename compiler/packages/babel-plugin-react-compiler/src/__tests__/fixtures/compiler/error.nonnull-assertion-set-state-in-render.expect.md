
## Input

```javascript
// @validateNoSetStateInRender
import {useState} from 'react';

function Component() {
  const [state, setState] = useState(0);
  const reset = () => setState(1);
  const assertedReset = reset!;
  assertedReset!();
  return state;
}

```


## Error

```
Found 1 error:

Error: Cannot call setState during render

Calling setState during render may trigger an infinite loop.
* To reset state when other state/props change, store the previous value in state and update conditionally: https://react.dev/reference/react/useState#storing-information-from-previous-renders
* To derive data from other state/props, compute the derived data during render without using state.

error.nonnull-assertion-set-state-in-render.ts:8:2
   6 |   const reset = () => setState(1);
   7 |   const assertedReset = reset!;
>  8 |   assertedReset!();
     |   ^^^^^^^^^^^^^^ Found setState() in render
   9 |   return state;
  10 | }
  11 |
```
          
      