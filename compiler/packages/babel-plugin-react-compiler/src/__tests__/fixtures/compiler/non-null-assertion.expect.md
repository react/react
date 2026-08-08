
## Input

```javascript
interface ComponentProps {
  name?: string;
}

function Component(props: ComponentProps) {
  return props.name!.toUpperCase();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Alice'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
interface ComponentProps {
  name?: string;
}

function Component(props) {
  const $ = _c(2);
  const t0 = props.name!;
  let t1;
  if ($[0] !== t0) {
    t1 = t0.toUpperCase();
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ name: "Alice" }],
};

```
      
### Eval output
(kind: ok) "ALICE"