
## Input

```javascript
import {Stringify, useIdentity} from 'shared-runtime';

const i18n = {
  locale: 'fr',
  t(strings, ...values) {
    return `[${this.locale}] ` + String.raw({raw: strings}, ...values);
  },
};

// i18n.t must be called as a method, even with a hook in the interpolation
function Greeting(props) {
  const message = props.i18n.t`Hello ${useIdentity(props.name)}`;
  return <Stringify message={message} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Greeting,
  params: [{i18n, name: 'Alice'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify, useIdentity } from "shared-runtime";

const i18n = {
  locale: "fr",
  t(strings, ...values) {
    return `[${this.locale}] ` + String.raw({ raw: strings }, ...values);
  },
};

// i18n.t must be called as a method, even with a hook in the interpolation
function Greeting(props) {
  const $ = _c(2);
  const message = props.i18n.t`Hello ${useIdentity(props.name)}`;
  let t0;
  if ($[0] !== message) {
    t0 = <Stringify message={message} />;
    $[0] = message;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Greeting,
  params: [{ i18n, name: "Alice" }],
};

```
      
### Eval output
(kind: ok) <div>{"message":"[fr] Hello Alice"}</div>