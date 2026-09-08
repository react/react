
## Input

```javascript
// @flow
function Component({config}: {config: {[key: string]: unknown}}) {
  const items = [];
  for (const [key, value] of Object.entries(config)) {
    items.push((value: {[key: string]: string}));
  }
  return <List items={items} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(2);
  const { config } = t0;
  let t1;
  if ($[0] !== config) {
    const items = [];
    for (const [key, value] of Object.entries(config)) {
      items.push((value: { [key: string]: string }));
    }
    t1 = <List items={items} />;
    $[0] = config;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented