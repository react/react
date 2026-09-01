
## Input

```javascript
// @expectNothingCompiled
function Component(props) {
  'use no memo';
  let x = [props.foo];
  return <div x={x}>"foo"</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{foo: 1}],
  isComponent: true,
};

```

## Code

```javascript
// @expectNothingCompiled
function Component(props) {
  "use no memo";
  let x = [props.foo];
  return <div x={x}>"foo"</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ foo: 1 }],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div x="1">"foo"</div>