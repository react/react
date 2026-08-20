
## Input

```javascript
import {useRef} from 'react';
import {addOne} from 'shared-runtime';

function useKeyCommand() {
  const currentPosition = useRef(0);
  const handleKey = direction => () => {
    const position = currentPosition.current;
    const nextPosition = direction === 'left' ? addOne(position) : position;
    currentPosition.current = nextPosition;
  };
  const moveLeft = {
    handler: handleKey('left'),
  };
  const moveRight = {
    handler: handleKey('right'),
  };
  return [moveLeft, moveRight];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useKeyCommand,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useRef } from "react";
import { addOne } from "shared-runtime";

function useKeyCommand() {
  const $ = _c(1);
  const currentPosition = useRef(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const handleKey = (direction) => () => {
      const position = currentPosition.current;
      const nextPosition = direction === "left" ? addOne(position) : position;
      currentPosition.current = nextPosition;
    };
    const moveLeft = { handler: handleKey("left") };
    const moveRight = { handler: handleKey("right") };
    t0 = [moveLeft, moveRight];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useKeyCommand,
  params: [],
};

```
      
### Eval output
(kind: ok) [{"handler":"[[ function params=0 ]]"},{"handler":"[[ function params=0 ]]"}]