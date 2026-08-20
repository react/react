
## Input

```javascript
import {graphql} from 'shared-runtime';

export function Component({a, b}) {
  const fragment = graphql`
    fragment Foo on User {
      name
    }
  `;
  return <div>{fragment}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 0}],
  sequentialRenders: [
    {a: 0, b: 0},
    {a: 1, b: 0},
    {a: 1, b: 1},
    {a: 1, b: 2},
    {a: 2, b: 2},
    {a: 3, b: 2},
    {a: 0, b: 0},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { graphql } from "shared-runtime";

export function Component(t0) {
  const $ = _c(1);
  const fragment = graphql`
    fragment Foo on User {
      name
    }
  `;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <div>{fragment}</div>;
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 0, b: 0 }],
  sequentialRenders: [
    { a: 0, b: 0 },
    { a: 1, b: 0 },
    { a: 1, b: 1 },
    { a: 1, b: 2 },
    { a: 2, b: 2 },
    { a: 3, b: 2 },
    { a: 0, b: 0 },
  ],
};

```
      
### Eval output
(kind: ok) <div>
    fragment Foo on User {
      name
    }
  </div>
<div>
    fragment Foo on User {
      name
    }
  </div>
<div>
    fragment Foo on User {
      name
    }
  </div>
<div>
    fragment Foo on User {
      name
    }
  </div>
<div>
    fragment Foo on User {
      name
    }
  </div>
<div>
    fragment Foo on User {
      name
    }
  </div>
<div>
    fragment Foo on User {
      name
    }
  </div>