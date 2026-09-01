
## Input

```javascript
// @validateRefAccessDuringRender
function Component(props) {
  const ref = useRef(null);
  const value = ref.current;
  return value;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-access-ref-during-render.ts:4:16
  2 | function Component(props) {
  3 |   const ref = useRef(null);
> 4 |   const value = ref.current;
    |                 ^^^^^^^^^^^ Cannot access ref value during render
  5 |   return value;
  6 | }
  7 |
```
          
      