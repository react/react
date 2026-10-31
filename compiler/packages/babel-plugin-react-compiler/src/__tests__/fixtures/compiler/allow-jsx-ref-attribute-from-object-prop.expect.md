
## Input

```javascript
// @validateRefAccessDuringRender
function Component({ctx}) {
  return (
    <div ref={ctx.foo}>
      {ctx.files.length > 0 ? <p>{ctx.files.length}</p> : null}
    </div>
  );
}

function ComponentWithLocal({ctx}) {
  const r = ctx.inputRef;
  return (
    <div ref={r}>
      {ctx.files.length > 0 ? <p>{ctx.files.length}</p> : null}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      ctx: {
        foo: value => console.log(value?.tagName),
        files: ['file'],
      },
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender
function Component(t0) {
  const $ = _c(5);
  const { ctx } = t0;
  let t1;
  if ($[0] !== ctx.files.length) {
    t1 = ctx.files.length > 0 ? <p>{ctx.files.length}</p> : null;
    $[0] = ctx.files.length;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== ctx.foo || $[3] !== t1) {
    t2 = <div ref={ctx.foo}>{t1}</div>;
    $[2] = ctx.foo;
    $[3] = t1;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

function ComponentWithLocal(t0) {
  const $ = _c(5);
  const { ctx } = t0;
  const r = ctx.inputRef;
  let t1;
  if ($[0] !== ctx.files.length) {
    t1 = ctx.files.length > 0 ? <p>{ctx.files.length}</p> : null;
    $[0] = ctx.files.length;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== r || $[3] !== t1) {
    t2 = <div ref={r}>{t1}</div>;
    $[2] = r;
    $[3] = t1;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      ctx: {
        foo: (value) => {
          return console.log(value?.tagName);
        },
        files: ["file"],
      },
    },
  ],
};

```
      
### Eval output
(kind: ok) <div><p>1</p></div>
logs: ['DIV']