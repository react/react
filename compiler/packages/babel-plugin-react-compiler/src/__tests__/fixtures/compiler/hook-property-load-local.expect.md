
## Input

```javascript
function useFoo() {}

function Foo() {
  let name = useFoo.name;
  console.log(name);
  return name;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```

## Code

```javascript
function useFoo() {}

function Foo() {
  const name = useFoo.name;
  console.log(name);
  return name;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```
      
### Eval output
(kind: ok) "useFoo"
logs: ['useFoo']