
## Input

```javascript
function Component(props) {
  const x = props.foo
    ? 1
    : (() => {
        throw new Error('Did not receive 1');
      })();
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{foo: true}],
};

```

## Code

```javascript
function Component(props) {
  props.foo ? 1 : _temp();
  return items;
}
function _temp() {
  throw new Error("Did not receive 1");
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ foo: true }],
};

```
      
### Eval output
(kind: exception) items is not defined