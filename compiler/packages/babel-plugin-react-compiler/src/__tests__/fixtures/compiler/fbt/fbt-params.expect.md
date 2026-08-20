
## Input

```javascript
import fbt from 'fbt';

function Component(props) {
  return (
    <div>
      <fbt desc={'Dialog to show to user'}>
        Hello <fbt:param name="user name">{props.name}</fbt:param>
      </fbt>
      <fbt desc={'Available actions|response'}>
        <fbt:param name="actions|response">{props.actions}</fbt:param>
      </fbt>
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import fbt from "fbt";

function Component(props) {
  const $ = _c(7);
  let t0;
  if ($[0] !== props.name) {
    t0 = fbt._("Hello {user name}", [fbt._param("user name", props.name)], {
      hk: "2zEDKF",
    });
    $[0] = props.name;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  let t1;
  if ($[2] !== props.actions) {
    t1 = fbt._(
      "{actions|response}",
      [fbt._param("actions|response", props.actions)],
      { hk: "1cjfbg" },
    );
    $[2] = props.actions;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  let t2;
  if ($[4] !== t0 || $[5] !== t1) {
    t2 = (
      <div>
        {t0}
        {t1}
      </div>
    );
    $[4] = t0;
    $[5] = t1;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      