
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees:true

import {useRef, useMemo} from 'react';
import {makeArray} from 'shared-runtime';

function useFoo() {
  const r = useRef();
  return useMemo(() => makeArray(r), []);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.maybe-mutable-ref-not-preserved.ts:8:33
   6 | function useFoo() {
   7 |   const r = useRef();
>  8 |   return useMemo(() => makeArray(r), []);
     |                                  ^ Passing a ref to a function may read its value during render
   9 | }
  10 |
  11 | export const FIXTURE_ENTRYPOINT = {
```
          
      