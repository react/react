
## Input

```javascript
import fbt from 'fbt';
import {Stringify} from 'shared-runtime';

function Component(props) {
  const label = fbt(
    fbt.plural('bar', props.value.length, {
      many: 'bars',
      showCount: 'yes',
    }),
    'The label text'
  );
  return props.cond ? (
    <Stringify
      description={<fbt desc="Some text">Text here</fbt>}
      label={label.toString()}
    />
  ) : null;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true, value: [0, 1, 2]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import fbt from "fbt";
import { Stringify } from "shared-runtime";

function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] !== props.cond || $[1] !== props.value.length) {
    const label = fbt._(
      { "*": "{number} bars", _1: "1 bar" },
      [fbt._plural(props.value.length, "number")],
      { hk: "4mUen7" },
    );
    t0 = props.cond ? (
      <Stringify
        description={fbt._("Text here", null, { hk: "21YpZs" })}
        label={label.toString()}
      />
    ) : null;
    $[0] = props.cond;
    $[1] = props.value.length;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: true, value: [0, 1, 2] }],
};

```
      
### Eval output
(kind: ok) <div>{"description":"Text here","label":"3 bars"}</div>