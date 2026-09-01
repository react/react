
## Input

```javascript
// @enableNewMutationAliasingModel:false
import {ValidateMemoization} from 'shared-runtime';

const Codes = {
  en: {name: 'English'},
  ja: {name: 'Japanese'},
  ko: {name: 'Korean'},
  zh: {name: 'Chinese'},
};

function Component(a) {
  let keys;
  if (a) {
    keys = Object.keys(Codes);
  } else {
    return null;
  }
  const options = keys.map(code => {
    const country = Codes[code];
    return {
      name: country.name,
      code,
    };
  });
  return (
    <>
      <ValidateMemoization inputs={[]} output={keys} onlyCheckCompiled={true} />
      <ValidateMemoization
        inputs={[]}
        output={options}
        onlyCheckCompiled={true}
      />
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: false}],
  sequentialRenders: [
    {a: false},
    {a: true},
    {a: true},
    {a: false},
    {a: true},
    {a: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNewMutationAliasingModel:false
import { ValidateMemoization } from "shared-runtime";

const Codes = {
  en: { name: "English" },
  ja: { name: "Japanese" },
  ko: { name: "Korean" },
  zh: { name: "Chinese" },
};

function Component(a) {
  const $ = _c(4);
  let keys;
  if (a) {
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      t0 = Object.keys(Codes);
      $[0] = t0;
    } else {
      t0 = $[0];
    }
    keys = t0;
  } else {
    return null;
  }
  let t0;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = keys.map(_temp);
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const options = t0;
  let t1;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = (
      <ValidateMemoization inputs={[]} output={keys} onlyCheckCompiled={true} />
    );
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = (
      <>
        {t1}
        <ValidateMemoization
          inputs={[]}
          output={options}
          onlyCheckCompiled={true}
        />
      </>
    );
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}
function _temp(code) {
  const country = Codes[code];
  return { name: country.name, code };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: false }],
  sequentialRenders: [
    { a: false },
    { a: true },
    { a: true },
    { a: false },
    { a: true },
    { a: false },
  ],
};

```
      