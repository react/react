
## Input

```javascript
import {Stringify} from 'shared-runtime';

function tag(strings, ...values) {
  return {strings: [...strings], values};
}

function Component({name, count}) {
  const user = {name};
  const message = tag`Hello ${user}, you have ${count} messages`;
  // `tag` may capture `user`, so this mutation is memoized with `message`
  user.count = count;
  return <Stringify message={message} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Alice', count: 1}],
  sequentialRenders: [
    {name: 'Alice', count: 1},
    {name: 'Alice', count: 1},
    {name: 'Bob', count: 2},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function tag(strings, ...t0) {
  const $ = _c(5);
  const values = t0;
  let t1;
  if ($[0] !== strings) {
    t1 = [...strings];
    $[0] = strings;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== t1 || $[3] !== values) {
    t2 = { strings: t1, values };
    $[2] = t1;
    $[3] = values;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

function Component(t0) {
  const $ = _c(5);
  const { name, count } = t0;
  let message;
  if ($[0] !== count || $[1] !== name) {
    const user = { name };
    message = tag`Hello ${user}, you have ${count} messages`;

    user.count = count;
    $[0] = count;
    $[1] = name;
    $[2] = message;
  } else {
    message = $[2];
  }
  let t1;
  if ($[3] !== message) {
    t1 = <Stringify message={message} />;
    $[3] = message;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ name: "Alice", count: 1 }],
  sequentialRenders: [
    { name: "Alice", count: 1 },
    { name: "Alice", count: 1 },
    { name: "Bob", count: 2 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"message":{"strings":["Hello ",", you have "," messages"],"values":[{"name":"Alice","count":1},1]}}</div>
<div>{"message":{"strings":["Hello ",", you have "," messages"],"values":[{"name":"Alice","count":1},1]}}</div>
<div>{"message":{"strings":["Hello ",", you have "," messages"],"values":[{"name":"Bob","count":2},2]}}</div>