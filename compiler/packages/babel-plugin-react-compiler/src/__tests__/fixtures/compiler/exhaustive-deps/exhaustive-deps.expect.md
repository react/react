
## Input

```javascript
// @validateExhaustiveMemoizationDependencies
import {useCallback, useMemo} from 'react';
import {makeObject_Primitives, Stringify} from 'shared-runtime';

function useHook1(x) {
  return useMemo(() => {
    return x?.y.z?.a;
  }, [x?.y.z?.a]);
}
function useHook2(x) {
  useMemo(() => {
    return x.y.z?.a;
  }, [x.y.z?.a]);
}
function useHook3(x) {
  return useMemo(() => {
    return x?.y.z.a?.b;
  }, [x?.y.z.a?.b]);
}
function useHook4(x, y, z) {
  return useMemo(() => {
    return x?.y?.[(console.log(y), z?.b)];
  }, [x?.y, y, z?.b]);
}
function useHook5(x) {
  return useMemo(() => {
    const e = [];
    const local = makeObject_Primitives(x);
    const fn = () => {
      e.push(local);
    };
    fn();
    return e;
  }, [x]);
}
function useHook6(x) {
  return useMemo(() => {
    const f = [];
    f.push(x.y.z);
    f.push(x.y);
    f.push(x);
    return f;
  }, [x]);
}

function useHook7(x) {
  const [state, setState] = useState(true);
  const f = () => {
    setState(x => !x);
  };
  return useCallback(() => {
    f();
  }, [f]);
}

function Component({x, y, z}) {
  const a = useHook1(x);
  const b = useHook2(x);
  const c = useHook3(x);
  const d = useHook4(x, y, z);
  const e = useHook5(x);
  const f = useHook6(x);
  const g = useHook7(x);
  return <Stringify results={[a, b, c, d, e, f, g]} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateExhaustiveMemoizationDependencies
import { useCallback, useMemo } from "react";
import { makeObject_Primitives, Stringify } from "shared-runtime";

function useHook1(x) {
  x?.y.z?.a;
  return x?.y.z?.a;
}

function useHook2(x) {
  x.y.z?.a;
}

function useHook3(x) {
  x?.y.z.a?.b;
  return x?.y.z.a?.b;
}

function useHook4(x, y, z) {
  x?.y;
  z?.b;
  return x?.y?.[(console.log(y), z?.b)];
}

function useHook5(x) {
  const $ = _c(2);
  let e;
  if ($[0] !== x) {
    e = [];
    const local = makeObject_Primitives(x);
    const fn = () => {
      e.push(local);
    };

    fn();
    $[0] = x;
    $[1] = e;
  } else {
    e = $[1];
  }
  return e;
}

function useHook6(x) {
  const $ = _c(2);
  let f;
  if ($[0] !== x) {
    f = [];
    f.push(x.y.z);
    f.push(x.y);
    f.push(x);
    $[0] = x;
    $[1] = f;
  } else {
    f = $[1];
  }
  return f;
}

function useHook7(x) {
  const $ = _c(2);
  const [, setState] = useState(true);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      setState(_temp);
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const f = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => {
      f();
    };
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}
function _temp(x_0) {
  return !x_0;
}

function Component(t0) {
  const $ = _c(8);
  const { x, y, z } = t0;
  const a = useHook1(x);
  const b = useHook2(x);
  const c = useHook3(x);
  const d = useHook4(x, y, z);
  const e = useHook5(x);
  const f = useHook6(x);
  const g = useHook7(x);
  let t1;
  if (
    $[0] !== a ||
    $[1] !== b ||
    $[2] !== c ||
    $[3] !== d ||
    $[4] !== e ||
    $[5] !== f ||
    $[6] !== g
  ) {
    t1 = <Stringify results={[a, b, c, d, e, f, g]} />;
    $[0] = a;
    $[1] = b;
    $[2] = c;
    $[3] = d;
    $[4] = e;
    $[5] = f;
    $[6] = g;
    $[7] = t1;
  } else {
    t1 = $[7];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented