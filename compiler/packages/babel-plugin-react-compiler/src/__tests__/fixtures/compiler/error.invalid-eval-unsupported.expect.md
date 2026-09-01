
## Input

```javascript
function Component(props) {
  eval('props.x = true');
  return <div />;
}

```


## Error

```
Found 1 error:

Compilation Skipped: The 'eval' function is not supported

Eval is an anti-pattern in JavaScript, and the code executed cannot be evaluated by React Compiler.

error.invalid-eval-unsupported.ts:2:2
  1 | function Component(props) {
> 2 |   eval('props.x = true');
    |   ^^^^ The 'eval' function is not supported
  3 |   return <div />;
  4 | }
  5 |
```
          
      