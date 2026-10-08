
## Input

```javascript
function Component({name}: {name: string}) {
  try {
    const url = new URL(name);
    return (
      <div>
        {url.search}
        {url.hash}
      </div>
    );
  } catch {
    return null;
  }
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(5);
  const { name } = t0;
  try {
    let t1;
    if ($[0] !== name) {
      t1 = new URL(name);
      $[0] = name;
      $[1] = t1;
    } else {
      t1 = $[1];
    }
    const url = t1;
    let t2;
    if ($[2] !== url.hash || $[3] !== url.search) {
      t2 = (
        <div>
          {url.search}
          {url.hash}
        </div>
      );
      $[2] = url.hash;
      $[3] = url.search;
      $[4] = t2;
    } else {
      t2 = $[4];
    }
    return t2;
  } catch {
    return null;
  }
}

```
      
### Eval output
(kind: exception) Fixture not implemented