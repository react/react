
## Input

```javascript
import {jsx as _jsx} from 'react/jsx-runtime';
import {shallowCopy} from 'shared-runtime';

function Component(props) {
  const childprops = {style: {width: props.width}};
  const element = _jsx('div', {
    childprops: childprops,
    children: '"hello world"',
  });
  shallowCopy(childprops); // function that in theory could mutate, we assume not bc createElement freezes
  return element;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { jsx as _jsx } from "react/jsx-runtime";
import { shallowCopy } from "shared-runtime";

function Component(props) {
  const $ = _c(2);
  let element;
  if ($[0] !== props.width) {
    const childprops = { style: { width: props.width } };
    element = _jsx("div", { childprops, children: '"hello world"' });
    shallowCopy(childprops);
    $[0] = props.width;
    $[1] = element;
  } else {
    element = $[1];
  }
  return element;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div childprops="[object Object]">"hello world"</div>