
## Input

```javascript
// @outputMode:"lint"

function Foo() {
  'use memo';
  return <button onClick={() => alert('hello!')}>Click me!</button>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```

## Code

```javascript
// @outputMode:"lint"

function Foo() {
  "use memo";
  return <button onClick={() => alert("hello!")}>Click me!</button>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```
      
### Eval output
(kind: ok) <button>Click me!</button>