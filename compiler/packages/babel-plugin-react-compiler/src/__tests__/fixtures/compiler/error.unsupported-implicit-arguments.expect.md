
## Input

```javascript
function Component(props) {
  return <div>{arguments[0].value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 'hello'}],
};

```


## Error

```
Found 1 error:

Compilation Skipped: Implicit 'arguments' is not supported

React Compiler does not support compiling functions that reference the implicit arguments object.

error.unsupported-implicit-arguments.ts:2:15
  1 | function Component(props) {
> 2 |   return <div>{arguments[0].value}</div>;
    |                ^^^^^^^^^ Implicit 'arguments' is not supported
  3 | }
  4 |
  5 | export const FIXTURE_ENTRYPOINT = {
```
          
      