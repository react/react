
## Input

```javascript
function Component({useFoo}) {
  useFoo();
}

```


## Error

```
Found 1 error:

Error: Hooks must be the same function on every render, but this value may change over time to a different function. See https://react.dev/reference/rules/react-calls-components-and-hooks#dont-dynamically-use-hooks

error.invalid-hook-as-prop.ts:2:2
  1 | function Component({useFoo}) {
> 2 |   useFoo();
    |   ^^^^^^ Hooks must be the same function on every render, but this value may change over time to a different function. See https://react.dev/reference/rules/react-calls-components-and-hooks#dont-dynamically-use-hooks
  3 | }
  4 |
```
          
      