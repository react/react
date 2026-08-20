
## Input

```javascript
import {arrayPush, mutate} from 'shared-runtime';

function useFoo({value}) {
  let items = null;
  try {
    // Mutable range of `items` begins here, but its reactive scope block
    // should be aligned to above the try-block
    items = [];
    arrayPush(items, value);
  } catch {
    // ignore
  }
  mutate(items);
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{value: 2}],
  sequentialRenders: [{value: 2}, {value: 2}, {value: 3}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { arrayPush, mutate } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(2);
  const { value } = t0;
  let items;
  if ($[0] !== value) {
    try {
      items = [];
      arrayPush(items, value);
    } catch {}

    mutate(items);
    $[0] = value;
    $[1] = items;
  } else {
    items = $[1];
  }
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ value: 2 }],
  sequentialRenders: [{ value: 2 }, { value: 2 }, { value: 3 }],
};

```
      
### Eval output
(kind: ok) [2,"joe"]
[2,"joe"]
[3,"joe"]