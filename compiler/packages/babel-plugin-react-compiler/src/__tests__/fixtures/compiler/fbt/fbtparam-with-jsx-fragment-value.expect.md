
## Input

```javascript
import fbt from 'fbt';
import {identity} from 'shared-runtime';

function Component(props) {
  return (
    <Foo
      value={
        <fbt desc="Description of the parameter">
          <fbt:param name="value">{<>{identity(props.text)}</>}</fbt:param>%
        </fbt>
      }
    />
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import fbt from "fbt";
import { identity } from "shared-runtime";

function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props.text) {
    const t1 = identity(props.text);
    let t2;
    if ($[2] !== t1) {
      t2 = <>{t1}</>;
      $[2] = t1;
      $[3] = t2;
    } else {
      t2 = $[3];
    }
    t0 = (
      <Foo
        value={fbt._("{value}%", [fbt._param("value", t2)], { hk: "10F5Cc" })}
      />
    );
    $[0] = props.text;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

```
      