
## Input

```javascript
function Component(props) {
  return foo(useFoo);
}

```


## Error

```
Found 1 error:

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.invalid-pass-hook-as-call-arg.ts:2:13
  1 | function Component(props) {
> 2 |   return foo(useFoo);
    |              ^^^^^^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  3 | }
  4 |
```
          
      