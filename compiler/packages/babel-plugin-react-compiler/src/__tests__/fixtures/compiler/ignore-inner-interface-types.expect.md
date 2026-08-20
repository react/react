
## Input

```javascript
function Foo() {
  type X = number;
  interface Bar {
    baz: number;
  }
  return 0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```

## Code

```javascript
function Foo() {
  return 0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```
      
### Eval output
(kind: ok) 0