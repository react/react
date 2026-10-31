
## Input

```javascript
// @compilationMode:"infer" @customMacros:"t"
function t(strings, ...values) {
  return String.raw({raw: strings}, ...values);
}

// An i18n macro reads placeholders from source, so they must stay inline
function Greeting({user, count}) {
  return <p>{t`Hello ${user.name ?? 'guest'}, you have ${count} messages`}</p>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Greeting,
  params: [{user: {name: 'Alice'}, count: 2}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer" @customMacros:"t"
function t(strings, ...values) {
  return String.raw({ raw: strings }, ...values);
}

// An i18n macro reads placeholders from source, so they must stay inline
function Greeting(t0) {
  const $ = _c(5);
  const { user, count } = t0;
  let t1;
  if ($[0] !== count || $[1] !== user.name) {
    t1 = t`Hello ${user.name ?? "guest"}, you have ${count} messages`;
    $[0] = count;
    $[1] = user.name;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== t1) {
    t2 = <p>{t1}</p>;
    $[3] = t1;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Greeting,
  params: [{ user: { name: "Alice" }, count: 2 }],
};

```
      
### Eval output
(kind: ok) <p>Hello Alice, you have 2 messages</p>