
## Input

```javascript
// @validateRefAccessDuringRender
function Component() {
  const ref = useRef(null);
  ref.current = false;

  return <button ref={ref} />;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-disallow-mutating-ref-in-render.ts:4:2
  2 | function Component() {
  3 |   const ref = useRef(null);
> 4 |   ref.current = false;
    |   ^^^^^^^^^^^ Cannot update ref during render
  5 |
  6 |   return <button ref={ref} />;
  7 | }
```
          
      