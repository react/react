
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
    handler: handleKey('left')(),
  };
  const moveRight = {
    handler: handleKey('right')(),
  };
  return [moveLeft, moveRight];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useKeyCommand,
  params: [],
};

```


## Error

```
Found 2 errors:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.capture-ref-for-mutation.ts:12:13
  10 |   };
  11 |   const moveLeft = {
> 12 |     handler: handleKey('left')(),
     |              ^^^^^^^^^^^^^^^^^ This function accesses a ref value
  13 |   };
  14 |   const moveRight = {
  15 |     handler: handleKey('right')(),

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.capture-ref-for-mutation.ts:15:13
  13 |   };
  14 |   const moveRight = {
> 15 |     handler: handleKey('right')(),
     |              ^^^^^^^^^^^^^^^^^^ This function accesses a ref value
  16 |   };
  17 |   return [moveLeft, moveRight];
  18 | }
```
          
      