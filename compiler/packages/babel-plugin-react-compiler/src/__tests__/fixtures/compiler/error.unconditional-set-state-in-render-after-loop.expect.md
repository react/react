
## Input

```javascript
// @validateNoSetStateInRender
function Component(props) {
  const [state, setState] = useState(false);
  for (const _ of props) {
  }
  setState(true);
  return state;
}

```


## Error

```
Found 1 error:

Error: Cannot call setState during render

Calling setState during render may trigger an infinite loop.
* To reset state when other state/props change, store the previous value in state and update conditionally: https://react.dev/reference/react/useState#storing-information-from-previous-renders
* To derive data from other state/props, compute the derived data during render without using state.

error.unconditional-set-state-in-render-after-loop.ts:6:2
  4 |   for (const _ of props) {
  5 |   }
> 6 |   setState(true);
    |   ^^^^^^^^ Found setState() in render
  7 |   return state;
  8 | }
  9 |
```
          
      