
## Input

```javascript
function component({mutator}) {
  const poke = () => {
    mutator.poke();
  };

  const hide = () => {
    mutator.user.hide();
  };

  return <Foo poke={poke} hide={hide}></Foo>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function component(t0) {
  const $ = _c(7);
  const { mutator } = t0;
  let t1;
  if ($[0] !== mutator) {
    t1 = () => {
      mutator.poke();
    };
    $[0] = mutator;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const poke = t1;
  let t2;
  if ($[2] !== mutator.user) {
    t2 = () => {
      mutator.user.hide();
    };
    $[2] = mutator.user;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const hide = t2;
  let t3;
  if ($[4] !== hide || $[5] !== poke) {
    t3 = <Foo poke={poke} hide={hide} />;
    $[4] = hide;
    $[5] = poke;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

```
      