
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees

import {Builder} from 'shared-runtime';
function useTest({isNull, data}: {isNull: boolean; data: string}) {
  const result = Builder.makeBuilder(isNull, 'hello world')
    ?.push('1', 2)
    ?.push(3, {
      a: 4,
      b: 5,
      c: data,
    })
    ?.push(6, data)
    ?.push(7, '8')
    ?.push('8', Builder.makeBuilder(!isNull)?.push(9).vals)?.vals;
  return result;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useTest,
  params: [{isNull: false, data: 'param'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees

import { Builder } from "shared-runtime";
function useTest(t0) {
  const $ = _c(3);
  const { isNull, data } = t0;
  let t1;
  if ($[0] !== data || $[1] !== isNull) {
    t1 = Builder.makeBuilder(isNull, "hello world")
      ?.push("1", 2)
      ?.push(3, { a: 4, b: 5, c: data })
      ?.push(6, data)
      ?.push(7, "8")
      ?.push("8", Builder.makeBuilder(!isNull)?.push(9).vals)?.vals;
    $[0] = data;
    $[1] = isNull;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const result = t1;
  return result;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useTest,
  params: [{ isNull: false, data: "param" }],
};

```
      
### Eval output
(kind: ok) ["hello world","1",2,3,{"a":4,"b":5,"c":"param"},6,"param",7,"8","8",null]