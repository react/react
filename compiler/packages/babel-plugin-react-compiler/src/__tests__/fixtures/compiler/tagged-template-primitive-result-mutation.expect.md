
## Input

```javascript
// @compilationMode:"annotation"
function Component({initial}) {
  'use memo';
  const object = {value: initial};
  function tag() {
    object.value++;
    return 0;
  }
  tag`value`;
  return object.value;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{initial: 0}],
  sequentialRenders: [{initial: 0}, {initial: 0}],
};

```

## Code

```javascript
// @compilationMode:"annotation"
function Component(t0) {
  "use memo";
  const { initial } = t0;

  const object = { value: initial };
  const tag = function tag() {
    object.value = object.value + 1;
    return 0;
  };

  tag`value`;
  return object.value;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ initial: 0 }],
  sequentialRenders: [{ initial: 0 }, { initial: 0 }],
};

```
      
### Eval output
(kind: ok) 1
1