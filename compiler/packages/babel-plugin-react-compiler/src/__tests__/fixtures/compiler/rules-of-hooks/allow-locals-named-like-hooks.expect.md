
## Input

```javascript
import {makeObject_Primitives, Stringify} from 'shared-runtime';

function Component(props) {
  let useFeature = makeObject_Primitives();
  let x;
  if (useFeature) {
    x = [useFeature + useFeature].push(-useFeature);
  }
  let y = useFeature;
  let z = useFeature.useProperty;
  return (
    <Stringify val={useFeature}>
      {x}
      {y}
      {z}
    </Stringify>
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
import { makeObject_Primitives, Stringify } from "shared-runtime";

function Component(props) {
  const $ = _c(2);
  const useFeature = makeObject_Primitives();
  let x;
  if (useFeature) {
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      t0 = [useFeature + useFeature].push(-useFeature);
      $[0] = t0;
    } else {
      t0 = $[0];
    }
    x = t0;
  }

  const y = useFeature;
  const z = useFeature.useProperty;
  let t0;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = (
      <Stringify val={useFeature}>
        {x}
        {y}
        {z}
      </Stringify>
    );
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>{"val":{"a":0,"b":"value1","c":true},"children":[2,"[[ cyclic ref *1 ]]",null]}</div>