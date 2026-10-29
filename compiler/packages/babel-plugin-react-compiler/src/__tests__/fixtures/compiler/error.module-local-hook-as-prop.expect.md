
## Input

```javascript
function useFoo() {
  return 1;
}

function Component() {
  return <Child foo={useFoo} />;
}

```


## Error

```
Found 1 error:

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.module-local-hook-as-prop.ts:6:21
  4 |
  5 | function Component() {
> 6 |   return <Child foo={useFoo} />;
    |                      ^^^^^^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  7 | }
  8 |
```
          
      