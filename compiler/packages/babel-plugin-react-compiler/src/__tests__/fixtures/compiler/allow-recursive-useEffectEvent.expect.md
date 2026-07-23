
## Input

```javascript
import {useEffect, useEffectEvent, useState} from 'react';

function TimerBasedComponent(props) {
  const repeatEvent = useEffectEvent(() => {
    props.onRepeat();
    setTimeout(() => {
      repeatEvent();
    }, 60);
  });

  const [down, setDown] = useState(false);
  useEffect(() => {
    if (down) {
      repeatEvent();
    }
  }, [down]);

  return <button onClick={() => setDown(!down)} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useEffect, useEffectEvent, useState } from "react";

function TimerBasedComponent(props) {
  const $ = _c(9);
  let t0;
  if ($[0] !== props) {
    t0 = () => {
      props.onRepeat();
      setTimeout(() => {
        repeatEvent();
      }, 60);
    };
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const repeatEvent = useEffectEvent(t0);

  const [down, setDown] = useState(false);
  let t1;
  if ($[2] !== down || $[3] !== repeatEvent) {
    t1 = () => {
      if (down) {
        repeatEvent();
      }
    };
    $[2] = down;
    $[3] = repeatEvent;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  let t2;
  if ($[5] !== down) {
    t2 = [down];
    $[5] = down;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  useEffect(t1, t2);
  let t3;
  if ($[7] !== down) {
    t3 = <button onClick={() => setDown(!down)} />;
    $[7] = down;
    $[8] = t3;
  } else {
    t3 = $[8];
  }
  return t3;
}

```
      
### Eval output
(kind: exception) Fixture not implemented