
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({value}) {
  let nullish = value;
  nullish ??= 'fallback';
  let and = value;
  and &&= 'replaced';
  let or = value;
  or ||= 'default';
  return <Stringify nullish={nullish} and={and} or={or} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: null}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(4);
  const { value } = t0;
  let nullish = value;
  nullish ?? (nullish = "fallback");
  let and = value;
  and && (and = "replaced");
  let or = value;
  or || (or = "default");
  let t1;
  if ($[0] !== and || $[1] !== nullish || $[2] !== or) {
    t1 = <Stringify nullish={nullish} and={and} or={or} />;
    $[0] = and;
    $[1] = nullish;
    $[2] = or;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: null }],
};

```
      
### Eval output
(kind: ok) <div>{"nullish":"fallback","and":null,"or":"default"}</div>