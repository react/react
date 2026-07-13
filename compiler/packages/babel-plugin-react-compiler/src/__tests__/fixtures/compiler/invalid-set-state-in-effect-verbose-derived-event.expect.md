
## Input

```javascript
// @validateNoSetStateInEffects @enableVerboseNoSetStateInEffect
import {useState, useEffect} from 'react';

function VideoPlayer({isPlaying}) {
  const [wasPlaying, setWasPlaying] = useState(isPlaying);
  useEffect(() => {
    if (isPlaying !== wasPlaying) {
      setWasPlaying(isPlaying);
      console.log('Play state changed!');
    }
  }, [isPlaying, wasPlaying]);
  return <video />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: VideoPlayer,
  params: [{isPlaying: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoSetStateInEffects @enableVerboseNoSetStateInEffect
import { useState, useEffect } from "react";

function VideoPlayer(t0) {
  const $ = _c(5);
  const { isPlaying } = t0;
  const [wasPlaying, setWasPlaying] = useState(isPlaying);
  let t1;
  let t2;
  if ($[0] !== isPlaying || $[1] !== wasPlaying) {
    t1 = () => {
      if (isPlaying !== wasPlaying) {
        setWasPlaying(isPlaying);
        console.log("Play state changed!");
      }
    };
    t2 = [isPlaying, wasPlaying];
    $[0] = isPlaying;
    $[1] = wasPlaying;
    $[2] = t1;
    $[3] = t2;
  } else {
    t1 = $[2];
    t2 = $[3];
  }
  useEffect(t1, t2);
  let t3;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <video />;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: VideoPlayer,
  params: [{ isPlaying: true }],
};

```
      
### Eval output
(kind: ok) <video></video>