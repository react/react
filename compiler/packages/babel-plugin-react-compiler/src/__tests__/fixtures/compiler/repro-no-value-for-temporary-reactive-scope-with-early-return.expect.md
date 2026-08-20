
## Input

```javascript
// @flow @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
import {identity, makeObject_Primitives} from 'shared-runtime';
import fbt from 'fbt';

function Component(props) {
  const object = makeObject_Primitives();
  const cond = makeObject_Primitives();
  if (!cond) {
    return null;
  }

  return (
    <div className="foo">
      {fbt(
        'Lorum ipsum' + fbt.param('thing', object.b) + ' blah blah blah',
        'More text'
      )}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity, makeObject_Primitives } from "shared-runtime";
import fbt from "fbt";

function Component(props) {
  const $ = _c(2);
  let t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const object = makeObject_Primitives();
      const cond = makeObject_Primitives();
      if (!cond) {
        t1 = null;
        break bb0;
      }
      t0 = (
        <div className="foo">
          {fbt._(
            "Lorum ipsum{thing} blah blah blah",
            [fbt._param("thing", object.b)],
            { hk: "lwmuH" },
          )}
        </div>
      );
    }
    $[0] = t0;
    $[1] = t1;
  } else {
    t0 = $[0];
    t1 = $[1];
  }
  if (t1 !== Symbol.for("react.early_return_sentinel")) {
    return t1;
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div class="foo">Lorum ipsumvalue1 blah blah blah</div>