
## Input

```javascript
const TOTAL = 10;
function Component(props) {
  const items = [];
  for (let i = props.start ?? 0; i < props.items.length; i++) {
    const item = props.items[i];
    items.push(<div key={item.id}>{item.value}</div>);
  }
  return <div>{items}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      start: null,
      items: [
        {id: 0, value: 'zero'},
        {id: 1, value: 'one'},
      ],
    },
  ],
  sequentialRenders: [
    {
      start: 1,
      items: [
        {id: 0, value: 'zero'},
        {id: 1, value: 'one'},
      ],
    },
    {
      start: 2,
      items: [
        {id: 0, value: 'zero'},
        {id: 1, value: 'one'},
      ],
    },
    {
      start: 0,
      items: [
        {id: 0, value: 'zero'},
        {id: 1, value: 'one'},
        {id: 2, value: 'two'},
      ],
    },
    {
      start: 1,
      items: [
        {id: 0, value: 'zero'},
        {id: 1, value: 'one'},
        {id: 2, value: 'two'},
      ],
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const TOTAL = 10;
function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] !== props.items || $[1] !== props.start) {
    const items = [];
    for (let i = props.start ?? 0; i < props.items.length; i++) {
      const item = props.items[i];
      items.push(<div key={item.id}>{item.value}</div>);
    }
    t0 = <div>{items}</div>;
    $[0] = props.items;
    $[1] = props.start;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      start: null,
      items: [
        { id: 0, value: "zero" },
        { id: 1, value: "one" },
      ],
    },
  ],

  sequentialRenders: [
    {
      start: 1,
      items: [
        { id: 0, value: "zero" },
        { id: 1, value: "one" },
      ],
    },
    {
      start: 2,
      items: [
        { id: 0, value: "zero" },
        { id: 1, value: "one" },
      ],
    },
    {
      start: 0,
      items: [
        { id: 0, value: "zero" },
        { id: 1, value: "one" },
        { id: 2, value: "two" },
      ],
    },
    {
      start: 1,
      items: [
        { id: 0, value: "zero" },
        { id: 1, value: "one" },
        { id: 2, value: "two" },
      ],
    },
  ],
};

```
      
### Eval output
(kind: ok) <div><div>one</div></div>
<div></div>
<div><div>zero</div><div>one</div><div>two</div></div>
<div><div>one</div><div>two</div></div>