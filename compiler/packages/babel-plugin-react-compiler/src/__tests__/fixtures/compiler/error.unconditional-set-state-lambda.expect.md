
## Input

```javascript
// @validateNoSetStateInRender
function Component(props) {
  const [x, setX] = useState(0);

  const foo = () => {
    setX(1);
  };
  foo();

  return [x];
}

```


## Error

```
Found 1 error:

Error: Cannot call setState during render

Calling setState during render may trigger an infinite loop.
* To reset state when other state/props change, store the previous value in state and update conditionally: https://react.dev/reference/react/useState#storing-information-from-previous-renders
* To derive data from other state/props, compute the derived data during render without using state.

error.unconditional-set-state-lambda.ts:8:2
   6 |     setX(1);
   7 |   };
>  8 |   foo();
     |   ^^^ Found setState() in render
   9 |
  10 |   return [x];
  11 | }
```
          
      