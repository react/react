
## Input

```javascript
import fbt from 'fbt';

// Minimized from MDCAIGlassesPDPRxOOSBadge.react.js
// Tests that expand_fbt_scope_range syncs identifier mutable_ranges
// after expanding a scope's range (Rust value semantics vs TS shared reference).

function Component({selectedColor, selectedProduct, rxData}) {
  const rxIds = [];
  rxData.forEach(data => data.non_rx_id != null && rxIds.push(data.non_rx_id));

  const otherSize = selectedColor?.matchingProducts
    ?.filter(
      product =>
        product.id != null &&
        product.tags?.get('bridge') === selectedProduct?.tags?.get('bridge')
    )
    .find(
      product =>
        product.tags?.get('size') !== selectedProduct?.tags?.get('size')
    );

  const otherFrameSize = otherSize?.tags?.get('size');
  if (
    otherSize?.id != null &&
    otherFrameSize != null &&
    rxIds.includes(otherSize.id)
  ) {
    return (
      <div>
        {fbt(
          `Only available in ${fbt.param('frame size', otherFrameSize)} size`,
          'Badge text'
        )}
      </div>
    );
  }

  if (rxData.futureData.includes(selectedProduct?.id)) {
    return <div>{fbt('Out of stock', 'Badge text')}</div>;
  }

  return <div>{fbt('Not available', 'Badge text')}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      selectedColor: {
        matchingProducts: [
          {
            id: '1',
            tags: new Map([
              ['bridge', 'A'],
              ['size', 'S'],
            ]),
          },
        ],
      },
      selectedProduct: {
        id: '1',
        tags: new Map([
          ['bridge', 'A'],
          ['size', 'M'],
        ]),
      },
      rxData: Object.assign([{non_rx_id: '1'}], {futureData: []}),
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import fbt from "fbt";

// Minimized from MDCAIGlassesPDPRxOOSBadge.react.js
// Tests that expand_fbt_scope_range syncs identifier mutable_ranges
// after expanding a scope's range (Rust value semantics vs TS shared reference).

function Component(t0) {
  const $ = _c(8);
  const { selectedColor, selectedProduct, rxData } = t0;
  let rxIds;
  if ($[0] !== rxData) {
    rxIds = [];
    rxData.forEach(
      (data) => data.non_rx_id != null && rxIds.push(data.non_rx_id),
    );
    $[0] = rxData;
    $[1] = rxIds;
  } else {
    rxIds = $[1];
  }
  let t1;
  if (
    $[2] !== rxIds ||
    $[3] !== selectedColor?.matchingProducts ||
    $[4] !== selectedProduct?.tags
  ) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const otherSize = selectedColor?.matchingProducts
        ?.filter(
          (product) =>
            product.id != null &&
            product.tags?.get("bridge") ===
              selectedProduct?.tags?.get("bridge"),
        )
        .find(
          (product_0) =>
            product_0.tags?.get("size") !== selectedProduct?.tags?.get("size"),
        );
      const otherFrameSize = otherSize?.tags?.get("size");
      if (
        otherSize?.id != null &&
        otherFrameSize != null &&
        rxIds.includes(otherSize.id)
      ) {
        t1 = (
          <div>
            {fbt._(
              "Only available in {frame size} size",
              [fbt._param("frame size", otherFrameSize)],
              { hk: "4sIu3a" },
            )}
          </div>
        );
        break bb0;
      }
    }
    $[2] = rxIds;
    $[3] = selectedColor?.matchingProducts;
    $[4] = selectedProduct?.tags;
    $[5] = t1;
  } else {
    t1 = $[5];
  }
  if (t1 !== Symbol.for("react.early_return_sentinel")) {
    return t1;
  }

  if (rxData.futureData.includes(selectedProduct?.id)) {
    let t2;
    if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
      t2 = <div>{fbt._("Out of stock", null, { hk: "M2wQM" })}</div>;
      $[6] = t2;
    } else {
      t2 = $[6];
    }
    return t2;
  }
  let t2;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <div>{fbt._("Not available", null, { hk: "43mHFe" })}</div>;
    $[7] = t2;
  } else {
    t2 = $[7];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      selectedColor: {
        matchingProducts: [
          {
            id: "1",
            tags: new Map([
              ["bridge", "A"],
              ["size", "S"],
            ]),
          },
        ],
      },
      selectedProduct: {
        id: "1",
        tags: new Map([
          ["bridge", "A"],
          ["size", "M"],
        ]),
      },
      rxData: Object.assign([{ non_rx_id: "1" }], { futureData: [] }),
    },
  ],
};

```
      
### Eval output
(kind: ok) <div>Only available in S size</div>