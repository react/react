
## Input

```javascript
import {useState, useEffect} from 'react';
import {invoke, Stringify} from 'shared-runtime';

function Content() {
  const [announcement, setAnnouncement] = useState('');
  const [users, setUsers] = useState([{name: 'John Doe'}, {name: 'Jane Doe'}]);

  // This was originally passed down as an onClick, but React Compiler's test
  // evaluator doesn't yet support events outside of React
  useEffect(() => {
    if (users.length === 2) {
      let removedUserName = '';
      setUsers(prevUsers => {
        const newUsers = [...prevUsers];
        removedUserName = newUsers.at(-1).name;
        newUsers.pop();
        return newUsers;
      });

      setAnnouncement(`Removed user (${removedUserName})`);
    }
  }, [users]);

  return <Stringify users={users} announcement={announcement} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Content,
  params: [{}],
  sequentialRenders: [{}, {}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState, useEffect } from "react";
import { invoke, Stringify } from "shared-runtime";

function Content() {
  const $ = _c(8);
  const [announcement, setAnnouncement] = useState("");
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [{ name: "John Doe" }, { name: "Jane Doe" }];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const [users, setUsers] = useState(t0);
  let t1;
  if ($[1] !== users.length) {
    t1 = () => {
      if (users.length === 2) {
        let removedUserName = "";
        setUsers((prevUsers) => {
          const newUsers = [...prevUsers];
          removedUserName = newUsers.at(-1).name;
          newUsers.pop();
          return newUsers;
        });

        setAnnouncement(`Removed user (${removedUserName})`);
      }
    };
    $[1] = users.length;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== users) {
    t2 = [users];
    $[3] = users;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  useEffect(t1, t2);
  let t3;
  if ($[5] !== announcement || $[6] !== users) {
    t3 = <Stringify users={users} announcement={announcement} />;
    $[5] = announcement;
    $[6] = users;
    $[7] = t3;
  } else {
    t3 = $[7];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Content,
  params: [{}],
  sequentialRenders: [{}, {}],
};

```
      
### Eval output
(kind: ok) <div>{"users":[{"name":"John Doe"}],"announcement":"Removed user (Jane Doe)"}</div>
<div>{"users":[{"name":"John Doe"}],"announcement":"Removed user (Jane Doe)"}</div>