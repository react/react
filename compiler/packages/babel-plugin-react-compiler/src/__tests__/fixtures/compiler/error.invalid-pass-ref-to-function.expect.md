
## Input

```javascript
// @validateRefAccessDuringRender
function Component(props) {
  const ref = useRef(null);
  const x = foo(ref);
  return x.current;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-pass-ref-to-function.ts:4:16
  2 | function Component(props) {
  3 |   const ref = useRef(null);
> 4 |   const x = foo(ref);
    |                 ^^^ Passing a ref to a function may read its value during render
  5 |   return x.current;
  6 | }
  7 |
```
          
      