
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
  let t0;
  if ($[0] !== props.name) {
    t0 = props.name.toUpperCase();
    $[0] = props.name;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ name: "Alice" }],
};

```
      
### Eval output
(kind: ok) "ALICE"