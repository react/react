
## Input

```javascript
// @enableOptimisticBuiltinMethodShapes

/**
 * Evaluated regression test for https://github.com/facebook/react/issues/35902
 *
 * Runtime companion to
 * optimistic-builtin-method-shapes-unknown-receiver-map-issue35902 (a
 * compile-snapshot-only fixture). Here the sprout harness actually executes
 * both the original and the compiled output and asserts identical rendered
 * results across a sequence of re-renders, proving the flag-on code is
 * semantically correct.
 *
 * `expensiveProcessing` is defined module-locally (not imported from
 * shared-runtime) so its return value keeps an UNKNOWN type -- a typed import
 * would give the `.map` receiver a known shape and defeat the flag path under
 * test. With @enableOptimisticBuiltinMethodShapes the unknown receiver's `.map`
 * resolves to the builtin Array shape, so calling `.map` does not extend the
 * receiver's mutable range into the `onClick`-capturing `handleClick` callback.
 * As a result `expensiveProcessing(data)` lands in its own reactive scope keyed
 * only on `data` and does not re-run when only `onClick` changes.
 *
 * The sequentialRenders below exercise re-renders where only the non-data input
 * (`onClick` identity) changes with a stable `data` reference, then re-renders
 * where `data` itself changes.
 */
import {Stringify} from 'shared-runtime';

function expensiveProcessing(data) {
  return data.map(value => ({id: value}));
}

function ExpensiveComponent({data, onClick}) {
  const processedData = expensiveProcessing(data);

  const handleClick = item => {
    onClick(item.id);
  };

  return (
    <div>
      {processedData.map(item => (
        <Stringify
          key={item.id}
          id={item.id}
          onClick={() => handleClick(item)}
        />
      ))}
    </div>
  );
}

const DATA1 = [1, 2, 3];
const DATA2 = [4, 5];
const onClickA = id => id;
const onClickB = id => id;

export const FIXTURE_ENTRYPOINT = {
  fn: ExpensiveComponent,
  params: [{data: DATA1, onClick: onClickA}],
  sequentialRenders: [
    // initial
    {data: DATA1, onClick: onClickA},
    // same data reference, only the non-data input (onClick identity) changes
    {data: DATA1, onClick: onClickB},
    // same data reference and same onClick: nothing changes
    {data: DATA1, onClick: onClickB},
    // data changes, onClick held constant
    {data: DATA2, onClick: onClickB},
    // same data reference, onClick identity changes
    {data: DATA2, onClick: onClickA},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableOptimisticBuiltinMethodShapes

/**
 * Evaluated regression test for https://github.com/facebook/react/issues/35902
 *
 * Runtime companion to
 * optimistic-builtin-method-shapes-unknown-receiver-map-issue35902 (a
 * compile-snapshot-only fixture). Here the sprout harness actually executes
 * both the original and the compiled output and asserts identical rendered
 * results across a sequence of re-renders, proving the flag-on code is
 * semantically correct.
 *
 * `expensiveProcessing` is defined module-locally (not imported from
 * shared-runtime) so its return value keeps an UNKNOWN type -- a typed import
 * would give the `.map` receiver a known shape and defeat the flag path under
 * test. With @enableOptimisticBuiltinMethodShapes the unknown receiver's `.map`
 * resolves to the builtin Array shape, so calling `.map` does not extend the
 * receiver's mutable range into the `onClick`-capturing `handleClick` callback.
 * As a result `expensiveProcessing(data)` lands in its own reactive scope keyed
 * only on `data` and does not re-run when only `onClick` changes.
 *
 * The sequentialRenders below exercise re-renders where only the non-data input
 * (`onClick` identity) changes with a stable `data` reference, then re-renders
 * where `data` itself changes.
 */
import { Stringify } from "shared-runtime";

function expensiveProcessing(data) {
  const $ = _c(2);
  let t0;
  if ($[0] !== data) {
    t0 = data.map(_temp);
    $[0] = data;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
function _temp(value) {
  return { id: value };
}

function ExpensiveComponent(t0) {
  const $ = _c(7);
  const { data, onClick } = t0;
  let t1;
  if ($[0] !== data) {
    t1 = expensiveProcessing(data);
    $[0] = data;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const processedData = t1;
  let t2;
  if ($[2] !== onClick) {
    t2 = (item) => {
      onClick(item.id);
    };
    $[2] = onClick;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const handleClick = t2;
  let t3;
  if ($[4] !== handleClick || $[5] !== processedData) {
    t3 = (
      <div>
        {processedData.map((item_0) => (
          <Stringify
            key={item_0.id}
            id={item_0.id}
            onClick={() => handleClick(item_0)}
          />
        ))}
      </div>
    );
    $[4] = handleClick;
    $[5] = processedData;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

const DATA1 = [1, 2, 3];
const DATA2 = [4, 5];
const onClickA = (id) => {
  return id;
};
const onClickB = (id) => {
  return id;
};

export const FIXTURE_ENTRYPOINT = {
  fn: ExpensiveComponent,
  params: [{ data: DATA1, onClick: onClickA }],
  sequentialRenders: [
    // initial
    { data: DATA1, onClick: onClickA },
    // same data reference, only the non-data input (onClick identity) changes
    { data: DATA1, onClick: onClickB },
    // same data reference and same onClick: nothing changes
    { data: DATA1, onClick: onClickB },
    // data changes, onClick held constant
    { data: DATA2, onClick: onClickB },
    // same data reference, onClick identity changes
    { data: DATA2, onClick: onClickA },
  ],
};

```
      
### Eval output
(kind: ok) <div><div>{"id":1,"onClick":"[[ function params=0 ]]"}</div><div>{"id":2,"onClick":"[[ function params=0 ]]"}</div><div>{"id":3,"onClick":"[[ function params=0 ]]"}</div></div>
<div><div>{"id":1,"onClick":"[[ function params=0 ]]"}</div><div>{"id":2,"onClick":"[[ function params=0 ]]"}</div><div>{"id":3,"onClick":"[[ function params=0 ]]"}</div></div>
<div><div>{"id":1,"onClick":"[[ function params=0 ]]"}</div><div>{"id":2,"onClick":"[[ function params=0 ]]"}</div><div>{"id":3,"onClick":"[[ function params=0 ]]"}</div></div>
<div><div>{"id":4,"onClick":"[[ function params=0 ]]"}</div><div>{"id":5,"onClick":"[[ function params=0 ]]"}</div></div>
<div><div>{"id":4,"onClick":"[[ function params=0 ]]"}</div><div>{"id":5,"onClick":"[[ function params=0 ]]"}</div></div>