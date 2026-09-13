
## Input

```javascript
// @flow
function useChannelRowIndexes(input: ReadonlyArray<{isChannel: boolean}>) {
  const sections = [...input];
  let channelRowCount = 0;
  const indexes = sections.map(section => {
    if (!section.isChannel) {
      return -1;
    }
    return channelRowCount++;
  });
  return {channelRowCount, indexes};
}

export const FIXTURE_ENTRYPOINT = {
  fn: useChannelRowIndexes,
  params: [
    [
      {isChannel: false},
      {isChannel: true},
      {isChannel: true},
      {isChannel: false},
    ],
  ],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useChannelRowIndexes(input) {
  const $ = _c(6);
  let channelRowCount;
  let t0;
  if ($[0] !== input) {
    const sections = [...input];
    channelRowCount = 0;
    t0 = sections.map((section) => {
      if (!section.isChannel) {
        return -1;
      }

      return channelRowCount++;
    });
    $[0] = input;
    $[1] = channelRowCount;
    $[2] = t0;
  } else {
    channelRowCount = $[1];
    t0 = $[2];
  }
  const indexes = t0;
  let t1;
  if ($[3] !== channelRowCount || $[4] !== indexes) {
    t1 = { channelRowCount, indexes };
    $[3] = channelRowCount;
    $[4] = indexes;
    $[5] = t1;
  } else {
    t1 = $[5];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useChannelRowIndexes,
  params: [
    [
      { isChannel: false },
      { isChannel: true },
      { isChannel: true },
      { isChannel: false },
    ],
  ],

  isComponent: false,
};

```
      
### Eval output
(kind: ok) {"channelRowCount":2,"indexes":[-1,0,1,-1]}