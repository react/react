
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({useFeature}) {
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
  params: [{useFeature: {useProperty: true}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(8);
  const { useFeature } = t0;
  let x;
  if (useFeature) {
    const t1 = useFeature + useFeature;
    let t2;
    if ($[0] !== t1 || $[1] !== useFeature) {
      t2 = [t1].push(-useFeature);
      $[0] = t1;
      $[1] = useFeature;
      $[2] = t2;
    } else {
      t2 = $[2];
    }
    x = t2;
  }

  const y = useFeature;
  const z = useFeature.useProperty;
  let t1;
  if ($[3] !== useFeature || $[4] !== x || $[5] !== y || $[6] !== z) {
    t1 = (
      <Stringify val={useFeature}>
        {x}
        {y}
        {z}
      </Stringify>
    );
    $[3] = useFeature;
    $[4] = x;
    $[5] = y;
    $[6] = z;
    $[7] = t1;
  } else {
    t1 = $[7];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ useFeature: { useProperty: true } }],
};

```
      
### Eval output
(kind: ok) <div>{"val":{"useProperty":true},"children":[2,"[[ cyclic ref *1 ]]",true]}</div>