
## Input

```javascript
function Component(props) {
  const items = props.items;
  const maxItems = props.maxItems;

  const renderedItems = [];
  const seen = new Set();
  const max = Math.max(0, maxItems);
  for (let i = 0; i < items.length; i += 1) {
    const item = items.at(i);
    if (item == null || seen.has(item)) {
      continue;
    }
    seen.add(item);
    renderedItems.push(<div>{item}</div>);
    if (renderedItems.length >= max) {
      break;
    }
  }
  const count = renderedItems.length;
  return (
    <div>
      <h1>{count} Items</h1>
      {renderedItems}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(8);
  const items = props.items;
  const maxItems = props.maxItems;
  let renderedItems;
  if ($[0] !== items || $[1] !== maxItems) {
    renderedItems = [];
    const seen = new Set();
    const max = Math.max(0, maxItems);
    for (let i = 0; i < items.length; i = i + 1, i) {
      const item = items.at(i);
      if (item == null || seen.has(item)) {
        continue;
      }

      seen.add(item);
      renderedItems.push(<div>{item}</div>);
      if (renderedItems.length >= max) {
        break;
      }
    }
    $[0] = items;
    $[1] = maxItems;
    $[2] = renderedItems;
  } else {
    renderedItems = $[2];
  }

  const count = renderedItems.length;
  let t0;
  if ($[3] !== count) {
    t0 = <h1>{count} Items</h1>;
    $[3] = count;
    $[4] = t0;
  } else {
    t0 = $[4];
  }
  let t1;
  if ($[5] !== renderedItems || $[6] !== t0) {
    t1 = (
      <div>
        {t0}
        {renderedItems}
      </div>
    );
    $[5] = renderedItems;
    $[6] = t0;
    $[7] = t1;
  } else {
    t1 = $[7];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      