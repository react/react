
## Input

```javascript
function Component(props) {
  const calls = [];
  const obj = {a: 1, b: 10, nested: {a: 0, b: 0}};
  const getObj = () => {
    calls.push('getObj');
    return obj;
  };
  const keys = ['a', 'b', 'a', 'b'];
  const getKey = () => {
    calls.push('getKey');
    return keys.shift();
  };
  // The object and the computed key must each be evaluated once
  getObj().a += props.value;
  obj[getKey()] *= 2;
  getObj()[getKey()] -= 1;
  getObj().nested[getKey()]++;
  const updated = ++getObj()[getKey()];
  return [obj, updated, calls];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 3}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(8);
  let calls;
  let obj;
  let t0;
  if ($[0] !== props.value) {
    calls = [];
    obj = { a: 1, b: 10, nested: { a: 0, b: 0 } };
    const getObj = () => {
      calls.push("getObj");
      return obj;
    };
    const keys = ["a", "b", "a", "b"];
    const getKey = () => {
      calls.push("getKey");
      return keys.shift();
    };
    const t1 = getObj();
    t1.a = t1.a + props.value;
    const t2 = getKey();
    obj[t2] = obj[t2] * 2;
    const t3 = getObj();
    const t4 = getKey();
    t3[t4] = t3[t4] - 1;
    const t5 = getObj().nested;
    const t6 = getKey();
    t5[t6] = t5[t6] + 1;
    const t7 = getObj();
    const t8 = getKey();
    t0 = t7[t8] = t7[t8] + 1;
    $[0] = props.value;
    $[1] = calls;
    $[2] = obj;
    $[3] = t0;
  } else {
    calls = $[1];
    obj = $[2];
    t0 = $[3];
  }
  const updated = t0;
  let t1;
  if ($[4] !== calls || $[5] !== obj || $[6] !== updated) {
    t1 = [obj, updated, calls];
    $[4] = calls;
    $[5] = obj;
    $[6] = updated;
    $[7] = t1;
  } else {
    t1 = $[7];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 3 }],
};

```
      
### Eval output
(kind: ok) [{"a":8,"b":10,"nested":{"a":1,"b":0}},10,["getObj","getKey","getObj","getKey","getObj","getKey","getObj","getKey"]]