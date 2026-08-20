
## Input

```javascript
import {useState} from 'react';

function Component(props) {
  const items = props.items ? props.items.slice() : [];
  const [state] = useState('');
  return props.cond ? (
    <div>{state}</div>
  ) : (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false, items: [{id: 0, name: 'Alice'}]}],
  sequentialRenders: [
    {cond: false, items: [{id: 0, name: 'Alice'}]},
    {
      cond: false,
      items: [
        {id: 0, name: 'Alice'},
        {id: 1, name: 'Bob'},
      ],
    },
    {
      cond: true,
      items: [
        {id: 0, name: 'Alice'},
        {id: 1, name: 'Bob'},
      ],
    },
    {
      cond: false,
      items: [
        {id: 1, name: 'Bob'},
        {id: 2, name: 'Claire'},
      ],
    },
  ],
};

```

## Code

```javascript
import { useState } from "react";

function Component(props) {
  const items = props.items ? props.items.slice() : [];
  const [state] = useState("");
  return props.cond ? <div>{state}</div> : <div>{items.map(_temp)}</div>;
}
function _temp(item) {
  return <div key={item.id}>{item.name}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: false, items: [{ id: 0, name: "Alice" }] }],
  sequentialRenders: [
    { cond: false, items: [{ id: 0, name: "Alice" }] },
    {
      cond: false,
      items: [
        { id: 0, name: "Alice" },
        { id: 1, name: "Bob" },
      ],
    },
    {
      cond: true,
      items: [
        { id: 0, name: "Alice" },
        { id: 1, name: "Bob" },
      ],
    },
    {
      cond: false,
      items: [
        { id: 1, name: "Bob" },
        { id: 2, name: "Claire" },
      ],
    },
  ],
};

```
      
### Eval output
(kind: ok) <div><div>Alice</div></div>
<div><div>Alice</div><div>Bob</div></div>
<div></div>
<div><div>Bob</div><div>Claire</div></div>