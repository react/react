
## Input

```javascript
// @validateNoSetStateInRender
function Component(props) {
  const [state, setState] = useState(false);
  for (const _ of props) {
    if (props.cond) {
      break;
    } else {
      continue;
    }
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

error.unconditional-set-state-in-render-after-loop-break.ts:11:2
   9 |     }
  10 |   }
> 11 |   setState(true);
     |   ^^^^^^^^ Found setState() in render
  12 |   return state;
  13 | }
  14 |
```
          
      