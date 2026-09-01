
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Foo({userIds}) {
  return (
    <Stringify
      fn={() => {
        const arr = [];

        for (const selectedUser of userIds) {
          arr.push(selectedUser);
        }
        return arr;
      }}
      shouldInvokeFns={true}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{userIds: [1, 2, 3]}],
  sequentialRenders: [{userIds: [1, 2, 4]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Foo(t0) {
  const $ = _c(2);
  const { userIds } = t0;
  let t1;
  if ($[0] !== userIds) {
    t1 = (
      <Stringify
        fn={() => {
          const arr = [];

          for (const selectedUser of userIds) {
            arr.push(selectedUser);
          }

          return arr;
        }}
        shouldInvokeFns={true}
      />
    );
    $[0] = userIds;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ userIds: [1, 2, 3] }],
  sequentialRenders: [{ userIds: [1, 2, 4] }],
};

```
      
### Eval output
(kind: ok) <div>{"fn":{"kind":"Function","result":[1,2,4]},"shouldInvokeFns":true}</div>