
## Input

```javascript
// Note that `a?.b.c` is semantically different from `(a?.b).c`
// Here, 'props?.a` is an optional chain, and `.b` is an unconditional load
// (nullthrows if a is nullish)

function Component(props) {
  let x = (props?.a).b;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
// Note that `a?.b.c` is semantically different from `(a?.b).c`
// Here, 'props?.a` is an optional chain, and `.b` is an unconditional load
// (nullthrows if a is nullish)

function Component(props) {
  const x = (props?.a).b;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      