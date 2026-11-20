
## Input

```javascript
import {useState} from 'react';

function createFormatter(locale) {
  return items => `${locale}:${items.length}`;
}

function useQuery() {
  return {data: {name: 'Ada'}};
}

const EMPTY = [];

function DefaultLiteral({items = [], locale}) {
  const [count] = useState(0);
  const formatter = createFormatter(locale);
  return (
    <div>
      {formatter(items)}
      {count}
    </div>
  );
}

function DefaultHoisted({items = EMPTY, locale}) {
  const [count] = useState(0);
  const formatter = createFormatter(locale);
  return (
    <div>
      {formatter(items)}
      {count}
    </div>
  );
}

function NoDefault({items, locale}) {
  const [count] = useState(0);
  const formatter = createFormatter(locale);
  return (
    <div>
      {formatter(items)}
      {count}
    </div>
  );
}

function HookDefault(props) {
  const {
    data: {user} = {},
  } = useQuery();
  const [count] = useState(0);
  const formatter = createFormatter(props.locale);
  return (
    <div>
      {formatter(user)}
      {count}
    </div>
  );
}

function ObjectArgDefault({items = [], count}) {
  const [ignored] = useState(0);
  return <div>{format({items, count: count + ignored})}</div>;
}

function format(value) {
  return value.items.length + value.count;
}

export const FIXTURE_ENTRYPOINT = {
  fn: DefaultLiteral,
  params: [{items: ['a'], locale: 'en'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState } from "react";

function createFormatter(locale) {
  const $ = _c(2);
  let t0;
  if ($[0] !== locale) {
    t0 = (items) => `${locale}:${items.length}`;
    $[0] = locale;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

function useQuery() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { data: { name: "Ada" } };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

const EMPTY = [];

function DefaultLiteral(t0) {
  const $ = _c(8);
  const { items: t1, locale } = t0;
  let t2;
  if ($[0] !== t1) {
    t2 = t1 === undefined ? [] : t1;
    $[0] = t1;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  const items = t2;
  const [count] = useState(0);
  let t3;
  if ($[2] !== items || $[3] !== locale) {
    const formatter = createFormatter(locale);
    t3 = formatter(items);
    $[2] = items;
    $[3] = locale;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  let t4;
  if ($[5] !== count || $[6] !== t3) {
    t4 = (
      <div>
        {t3}
        {count}
      </div>
    );
    $[5] = count;
    $[6] = t3;
    $[7] = t4;
  } else {
    t4 = $[7];
  }
  return t4;
}

function DefaultHoisted(t0) {
  const $ = _c(6);
  const { items: t1, locale } = t0;
  const items = t1 === undefined ? EMPTY : t1;
  const [count] = useState(0);
  let t2;
  if ($[0] !== items || $[1] !== locale) {
    const formatter = createFormatter(locale);
    t2 = formatter(items);
    $[0] = items;
    $[1] = locale;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  let t3;
  if ($[3] !== count || $[4] !== t2) {
    t3 = (
      <div>
        {t2}
        {count}
      </div>
    );
    $[3] = count;
    $[4] = t2;
    $[5] = t3;
  } else {
    t3 = $[5];
  }
  return t3;
}

function NoDefault(t0) {
  const $ = _c(6);
  const { items, locale } = t0;
  const [count] = useState(0);
  let t1;
  if ($[0] !== items || $[1] !== locale) {
    const formatter = createFormatter(locale);
    t1 = formatter(items);
    $[0] = items;
    $[1] = locale;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== count || $[4] !== t1) {
    t2 = (
      <div>
        {t1}
        {count}
      </div>
    );
    $[3] = count;
    $[4] = t1;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}

function HookDefault(props) {
  const $ = _c(8);
  const { data: t0 } = useQuery();
  let t1;
  if ($[0] !== t0) {
    t1 = t0 === undefined ? {} : t0;
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const { user } = t1;
  const [count] = useState(0);
  let t2;
  if ($[2] !== props.locale || $[3] !== user) {
    const formatter = createFormatter(props.locale);
    t2 = formatter(user);
    $[2] = props.locale;
    $[3] = user;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  let t3;
  if ($[5] !== count || $[6] !== t2) {
    t3 = (
      <div>
        {t2}
        {count}
      </div>
    );
    $[5] = count;
    $[6] = t2;
    $[7] = t3;
  } else {
    t3 = $[7];
  }
  return t3;
}

function ObjectArgDefault(t0) {
  const $ = _c(7);
  const { items: t1, count } = t0;
  let t2;
  if ($[0] !== t1) {
    t2 = t1 === undefined ? [] : t1;
    $[0] = t1;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  const items = t2;
  const [ignored] = useState(0);
  const t3 = count + ignored;
  let t4;
  if ($[2] !== items || $[3] !== t3) {
    t4 = format({ items, count: t3 });
    $[2] = items;
    $[3] = t3;
    $[4] = t4;
  } else {
    t4 = $[4];
  }
  let t5;
  if ($[5] !== t4) {
    t5 = <div>{t4}</div>;
    $[5] = t4;
    $[6] = t5;
  } else {
    t5 = $[6];
  }
  return t5;
}

function format(value) {
  return value.items.length + value.count;
}

export const FIXTURE_ENTRYPOINT = {
  fn: DefaultLiteral,
  params: [{ items: ["a"], locale: "en" }],
};

```
      
### Eval output
(kind: ok) <div>en:10</div>