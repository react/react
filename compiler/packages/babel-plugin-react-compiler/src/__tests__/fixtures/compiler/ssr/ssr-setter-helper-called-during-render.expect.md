
## Input

```javascript
// @outputMode:"ssr"
import {useState} from 'react';

function Component({sections}) {
  // The helper updates state during render, which React supports, so it is not
  // an event handler and must not be removed
  const [groups, setGroups] = useState(new Map());
  const nextGroups = new Map(groups);
  function onRenderGroup(id, title) {
    if (!nextGroups.has(id)) {
      nextGroups.set(id, title);
      setGroups(nextGroups);
    }
  }
  const rendered = sections.map(section => {
    section.ids.forEach(id => {
      onRenderGroup(id, section.title);
    });
    const ids = section.ids.filter(id => groups.get(id) === section.title);
    return <li key={section.title}>{ids.join(',')}</li>;
  });
  return <ul>{rendered}</ul>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      sections: [
        {title: 'a', ids: [1, 2]},
        {title: 'b', ids: [2, 3]},
      ],
    },
  ],
};

```

## Code

```javascript
// @outputMode:"ssr"
import { useState } from "react";

function Component(t0) {
  const { sections } = t0;

  const [groups, setGroups] = useState(new Map());
  const nextGroups = new Map(groups);
  const onRenderGroup = function onRenderGroup(id, title) {
    if (!nextGroups.has(id)) {
      nextGroups.set(id, title);
      setGroups(nextGroups);
    }
  };

  const rendered = sections.map((section) => {
    section.ids.forEach((id_0) => {
      onRenderGroup(id_0, section.title);
    });
    const ids = section.ids.filter(
      (id_1) => groups.get(id_1) === section.title,
    );
    return <li key={section.title}>{ids.join(",")}</li>;
  });
  return <ul>{rendered}</ul>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      sections: [
        { title: "a", ids: [1, 2] },
        { title: "b", ids: [2, 3] },
      ],
    },
  ],
};

```
      
### Eval output
(kind: ok) <ul><li>1,2</li><li>3</li></ul>