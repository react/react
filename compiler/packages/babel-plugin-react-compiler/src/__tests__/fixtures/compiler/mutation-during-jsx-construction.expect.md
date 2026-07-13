
## Input

```javascript
import {identity, mutate, mutateAndReturnNewValue} from 'shared-runtime';

function Component(props) {
  const key = {};
  // Key is modified by the function, but key itself is not frozen
  const element = <div key={mutateAndReturnNewValue(key)}>{props.value}</div>;
  // Key is later mutated here: this mutation must be grouped with the
  // jsx construction above
  mutate(key);
  return element;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity, mutate, mutateAndReturnNewValue } from "shared-runtime";

function Component(props) {
  const $ = _c(2);
  let element;
  if ($[0] !== props.value) {
    const key = {};
    element = <div key={mutateAndReturnNewValue(key)}>{props.value}</div>;

    mutate(key);
    $[0] = props.value;
    $[1] = element;
  } else {
    element = $[1];
  }
  return element;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
};

```
      
### Eval output
(kind: ok) <div>42</div>