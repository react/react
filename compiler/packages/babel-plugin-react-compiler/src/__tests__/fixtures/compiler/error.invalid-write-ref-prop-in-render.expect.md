
## Input

```javascript
// @validateRefAccessDuringRender @compilationMode:"infer"
function Component(props) {
  const ref = props.ref;
  ref.current = true;
  return <div>{value}</div>;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-write-ref-prop-in-render.ts:4:2
  2 | function Component(props) {
  3 |   const ref = props.ref;
> 4 |   ref.current = true;
    |   ^^^^^^^^^^^ Cannot update ref during render
  5 |   return <div>{value}</div>;
  6 | }
  7 |
```
          
      