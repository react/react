
## Input

```javascript
import {Stringify, identity, makeArray, mutate} from 'shared-runtime';

/**
 * Here, identity('foo') is an immutable allocating instruction.
 * `arr` is a mutable value whose mutable range ends at `arr.map`.
 *
 * The previous (reactive function) version of alignScopesToBlocks set the range of
 * both scopes to end at value blocks within the <></> expression.
 * However, both scope ranges should be aligned to the outer value block
 * (e.g. `cond1 ? <>: null`). The HIR version of alignScopesToBlocks
 * handles this correctly.
 */
function Foo({cond1, cond2}) {
  const arr = makeArray<any>({a: 2}, 2, []);

  return cond1 ? (
    <>
      <div>{identity('foo')}</div>
      <Stringify value={cond2 ? arr.map(mutate) : null} />
    </>
  ) : null;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{cond1: true, cond2: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify, identity, makeArray, mutate } from "shared-runtime";

/**
 * Here, identity('foo') is an immutable allocating instruction.
 * `arr` is a mutable value whose mutable range ends at `arr.map`.
 *
 * The previous (reactive function) version of alignScopesToBlocks set the range of
 * both scopes to end at value blocks within the <></> expression.
 * However, both scope ranges should be aligned to the outer value block
 * (e.g. `cond1 ? <>: null`). The HIR version of alignScopesToBlocks
 * handles this correctly.
 */
function Foo(t0) {
  const $ = _c(3);
  const { cond1, cond2 } = t0;
  let t1;
  if ($[0] !== cond1 || $[1] !== cond2) {
    const arr = makeArray({ a: 2 }, 2, []);
    t1 = cond1 ? (
      <>
        <div>{identity("foo")}</div>
        <Stringify value={cond2 ? arr.map(mutate) : null} />
      </>
    ) : null;
    $[0] = cond1;
    $[1] = cond2;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ cond1: true, cond2: true }],
};

```
      
### Eval output
(kind: ok) <div>foo</div><div>{"value":[null,null,null]}</div>