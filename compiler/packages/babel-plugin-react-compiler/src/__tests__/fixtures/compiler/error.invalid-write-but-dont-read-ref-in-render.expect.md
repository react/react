
## Input

```javascript
// @validateRefAccessDuringRender
function useHook({value}) {
  const ref = useRef(null);
  // Writing to a ref in render is against the rules:
  ref.current = value;
  // returning a ref is allowed, so this alone doesn't trigger an error:
  return ref;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-write-but-dont-read-ref-in-render.ts:5:2
  3 |   const ref = useRef(null);
  4 |   // Writing to a ref in render is against the rules:
> 5 |   ref.current = value;
    |   ^^^^^^^^^^^ Cannot update ref during render
  6 |   // returning a ref is allowed, so this alone doesn't trigger an error:
  7 |   return ref;
  8 | }
```
          
      