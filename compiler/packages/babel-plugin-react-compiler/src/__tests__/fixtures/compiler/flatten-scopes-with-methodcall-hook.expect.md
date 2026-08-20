
## Input

```javascript
const {ObjectWithHooks} = require('shared-runtime');

function Component(props) {
  const x = [];
  const [y] = ObjectWithHooks.useMakeArray();
  x.push(y);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
const { ObjectWithHooks } = require("shared-runtime");

function Component(props) {
  const x = [];
  const [y] = ObjectWithHooks.useMakeArray();
  x.push(y);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) 1