
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false
import fbt from 'fbt';

// Each plural count must select its own singular or plural form.

function useFoo({apples, bananas}) {
  return fbt(
    `${fbt.param('number of apples', apples)} ` +
      fbt.plural('apple', apples) +
      ` and ${fbt.param('number of bananas', bananas)} ` +
      fbt.plural('banana', bananas),
    'TestDescription',
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{apples: 1, bananas: 2}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees:false
import fbt from "fbt";

// Each plural count must select its own singular or plural form.

function useFoo(t0) {
  const $ = _c(3);
  const { apples, bananas } = t0;
  let t1;
  if ($[0] !== apples || $[1] !== bananas) {
    t1 = fbt._(
      {
        "*": {
          "*": "{number of apples} apples and {number of bananas} bananas",
          _1: "{number of apples} apples and {number of bananas} banana",
        },
        _1: {
          "*": "{number of apples} apple and {number of bananas} bananas",
          _1: "{number of apples} apple and {number of bananas} banana",
        },
      },
      [
        fbt._plural(apples),
        fbt._plural(bananas),
        fbt._param("number of apples", apples),
        fbt._param("number of bananas", bananas),
      ],
      { hk: "1mGnhr" },
    );
    $[0] = apples;
    $[1] = bananas;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ apples: 1, bananas: 2 }],
};

```
      
### Eval output
(kind: ok) 1 apple and 2 bananas