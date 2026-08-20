
## Input

```javascript
function Component(props) {
  const x = useState;
  const state = x(null);
  return state[0];
}

```


## Error

```
Found 1 error:

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.invalid-assign-hook-to-local.ts:2:12
  1 | function Component(props) {
> 2 |   const x = useState;
    |             ^^^^^^^^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  3 |   const state = x(null);
  4 |   return state[0];
  5 | }
```
          
      