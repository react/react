
## Input

```javascript
// @validateNoSetStateInRender @enableTreatSetIdentifiersAsStateSetters
function Component({setX}) {
  const aliased = setX;

  setX(1);
  aliased(2);

  return x;
}

```


## Error

```
Found 2 errors:

Error: Cannot call setState during render

Calling setState during render may trigger an infinite loop.
* To reset state when other state/props change, store the previous value in state and update conditionally: https://react.dev/reference/react/useState#storing-information-from-previous-renders
* To derive data from other state/props, compute the derived data during render without using state.

error.invalid-unconditional-set-state-prop-in-render.ts:5:2
  3 |   const aliased = setX;
  4 |
> 5 |   setX(1);
    |   ^^^^ Found setState() in render
  6 |   aliased(2);
  7 |
  8 |   return x;

Error: Cannot call setState during render

Calling setState during render may trigger an infinite loop.
* To reset state when other state/props change, store the previous value in state and update conditionally: https://react.dev/reference/react/useState#storing-information-from-previous-renders
* To derive data from other state/props, compute the derived data during render without using state.

error.invalid-unconditional-set-state-prop-in-render.ts:6:2
  4 |
  5 |   setX(1);
> 6 |   aliased(2);
    |   ^^^^^^^ Found setState() in render
  7 |
  8 |   return x;
  9 | }
```
          
      