
## Input

```javascript
// @flow
import {fbt} from 'fbt';

function Example({x}) {
  // "Inner Text" needs to be visible to fbt: the <Bar> element cannot
  // be memoized separately
  return (
    <fbt desc="Description">
      Outer Text
      <Foo key="b" x={x}>
        <Bar key="a">Inner Text</Bar>
      </Foo>
    </fbt>
  );
}

function Foo({x, children}) {
  'use no memo';
  return (
    <>
      <div>{x}</div>
      <span>{children}</span>
    </>
  );
}

function Bar({children}) {
  'use no memo';
  return children;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Example,
  params: [{x: 'Hello'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { fbt } from "fbt";

function Example(t0) {
  const $ = _c(2);
  const { x } = t0;
  let t1;
  if ($[0] !== x) {
    t1 = fbt._(
      "Outer Text {=m1}",
      [
        fbt._implicitParam(
          "=m1",

          <Foo key="b" x={x}>
            {fbt._(
              "{=m1}",
              [
                fbt._implicitParam(
                  "=m1",
                  <Bar key="a">
                    {fbt._("Inner Text", null, { hk: "32YB0l" })}
                  </Bar>,
                ),
              ],
              { hk: "23dJsI" },
            )}
          </Foo>,
        ),
      ],
      { hk: "2RVA7V" },
    );
    $[0] = x;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

function Foo({ x, children }) {
  "use no memo";
  return (
    <>
      <div>{x}</div>
      <span>{children}</span>
    </>
  );
}

function Bar({ children }) {
  "use no memo";
  return children;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Example,
  params: [{ x: "Hello" }],
};

```
      
### Eval output
(kind: ok) Outer Text <div>Hello</div><span>Inner Text</span>