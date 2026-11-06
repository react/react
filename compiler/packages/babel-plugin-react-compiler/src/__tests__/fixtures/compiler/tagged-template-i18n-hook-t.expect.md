
## Input

```javascript
// @compilationMode:"infer"
import {Stringify} from 'shared-runtime';

const translators = {
  en: (strings, ...values) => String.raw({raw: strings}, ...values),
  fr: (strings, ...values) => '[fr] ' + String.raw({raw: strings}, ...values),
};

function useTranslation(locale) {
  return translators[locale];
}

// Messages are recomputed when the locale (t) or an interpolated value changes
function Greeting({locale, name, count}) {
  const t = useTranslation(locale);
  return (
    <Stringify title={t`Hello ${name}`} body={t`You have ${count} messages`} />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Greeting,
  params: [{locale: 'en', name: 'Alice', count: 1}],
  sequentialRenders: [
    {locale: 'en', name: 'Alice', count: 1},
    {locale: 'en', name: 'Alice', count: 1},
    {locale: 'fr', name: 'Alice', count: 1},
    {locale: 'fr', name: 'Bob', count: 2},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer"
import { Stringify } from "shared-runtime";

const translators = {
  en: (strings, ...values) => String.raw({ raw: strings }, ...values),
  fr: (strings, ...values) => "[fr] " + String.raw({ raw: strings }, ...values),
};

function useTranslation(locale) {
  return translators[locale];
}

// Messages are recomputed when the locale (t) or an interpolated value changes
function Greeting(t0) {
  const $ = _c(9);
  const { locale, name, count } = t0;
  const t = useTranslation(locale);
  let t1;
  if ($[0] !== name || $[1] !== t) {
    t1 = t`Hello ${name}`;
    $[0] = name;
    $[1] = t;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== count || $[4] !== t) {
    t2 = t`You have ${count} messages`;
    $[3] = count;
    $[4] = t;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  let t3;
  if ($[6] !== t1 || $[7] !== t2) {
    t3 = <Stringify title={t1} body={t2} />;
    $[6] = t1;
    $[7] = t2;
    $[8] = t3;
  } else {
    t3 = $[8];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Greeting,
  params: [{ locale: "en", name: "Alice", count: 1 }],
  sequentialRenders: [
    { locale: "en", name: "Alice", count: 1 },
    { locale: "en", name: "Alice", count: 1 },
    { locale: "fr", name: "Alice", count: 1 },
    { locale: "fr", name: "Bob", count: 2 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"title":"Hello Alice","body":"You have 1 messages"}</div>
<div>{"title":"Hello Alice","body":"You have 1 messages"}</div>
<div>{"title":"[fr] Hello Alice","body":"[fr] You have 1 messages"}</div>
<div>{"title":"[fr] Hello Bob","body":"[fr] You have 2 messages"}</div>