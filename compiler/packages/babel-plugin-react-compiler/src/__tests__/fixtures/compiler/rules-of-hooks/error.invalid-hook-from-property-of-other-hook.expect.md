
## Input

```javascript
function useFoo({data}) {
  const player = useVideoPlayer();
  const foo = player.useMedia();
  return foo;
}

```


## Error

```
Found 1 error:

Error: Hooks must be the same function on every render, but this value may change over time to a different function. See https://react.dev/reference/rules/react-calls-components-and-hooks#dont-dynamically-use-hooks

error.invalid-hook-from-property-of-other-hook.ts:3:14
  1 | function useFoo({data}) {
  2 |   const player = useVideoPlayer();
> 3 |   const foo = player.useMedia();
    |               ^^^^^^^^^^^^^^^ Hooks must be the same function on every render, but this value may change over time to a different function. See https://react.dev/reference/rules/react-calls-components-and-hooks#dont-dynamically-use-hooks
  4 |   return foo;
  5 | }
  6 |
```
          
      