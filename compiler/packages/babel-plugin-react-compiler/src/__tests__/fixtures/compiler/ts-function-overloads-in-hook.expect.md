
## Input

```javascript
function useTranslatedResource(translations: {[key: string]: string}) {
  function formatValue(key: string): string;
  function formatValue(key: string | null | undefined): string | null;
  function formatValue(key: string | null | undefined) {
    if (!key) return null;
    if (!translations[key]) return key;
    return translations[key];
  }

  return {formatValue};
}

function Component() {
  const {formatValue} = useTranslatedResource({hello: 'Hello'});
  return <div>{formatValue('hello')}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useTranslatedResource(translations) {
  const $ = _c(2);
  let t0;
  if ($[0] !== translations) {
    const formatValue = function formatValue(key) {
      if (!key) {
        return null;
      }
      if (!translations[key]) {
        return key;
      }
      return translations[key];
    };
    t0 = { formatValue };
    $[0] = translations;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

function Component() {
  const $ = _c(5);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { hello: "Hello" };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const { formatValue } = useTranslatedResource(t0);
  let t1;
  if ($[1] !== formatValue) {
    t1 = formatValue("hello");
    $[1] = formatValue;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== t1) {
    t2 = <div>{t1}</div>;
    $[3] = t1;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>Hello</div>