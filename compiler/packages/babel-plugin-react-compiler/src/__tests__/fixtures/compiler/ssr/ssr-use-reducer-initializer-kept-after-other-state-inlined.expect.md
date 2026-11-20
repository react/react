
## Input

```javascript
// @outputMode:"ssr"
import {useReducer, useState} from 'react';

function useTheme() {
  const [theme] = useState('light');
  return theme;
}

function reducer(state, action) {
  return action;
}

// Throws the same message on every JavaScript engine, unlike JSON.parse
function parseConfig(json) {
  if (!json.endsWith('}')) {
    throw new Error('Malformed config');
  }
  return JSON.parse(json);
}

function Component({json}) {
  // Because a custom hook is called, `config` keeps its hook. Its only reader
  // is the reducer of `count`, which starts at a constant and is inlined, so
  // `config` ends up unread. Dead code elimination still keeps a reducer hook
  // that has an initializer, so the initializer runs (and throws for a
  // malformed config).
  const theme = useTheme();
  const [config] = useReducer(reducer, json, parseConfig);
  const [count] = useReducer(() => config, 0);
  return <div className={theme}>{count}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{json: '{'}],
};

```

## Code

```javascript
// @outputMode:"ssr"
import { useReducer, useState } from "react";

function useTheme() {
  const theme = "light";
  return theme;
}

function reducer(state, action) {
  return action;
}

// Throws the same message on every JavaScript engine, unlike JSON.parse
function parseConfig(json) {
  if (!json.endsWith("}")) {
    throw new Error("Malformed config");
  }

  return JSON.parse(json);
}

function Component(t0) {
  const { json } = t0;

  const theme = useTheme();
  useReducer(reducer, json, parseConfig);
  const count = 0;
  return <div className={theme}>{count}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ json: "{" }],
};

```
      
### Eval output
(kind: exception) Malformed config