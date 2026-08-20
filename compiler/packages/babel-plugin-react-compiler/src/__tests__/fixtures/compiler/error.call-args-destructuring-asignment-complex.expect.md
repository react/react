
## Input

```javascript
function Component(props) {
  let x = makeObject();
  x.foo(([[x]] = makeObject()));
  return x;
}

```


## Error

```
Found 1 error:

Invariant: Const declaration cannot be referenced as an expression

error.call-args-destructuring-asignment-complex.ts:3:9
  1 | function Component(props) {
  2 |   let x = makeObject();
> 3 |   x.foo(([[x]] = makeObject()));
    |          ^^^^^ this is Const
  4 |   return x;
  5 | }
  6 |
```
          
      