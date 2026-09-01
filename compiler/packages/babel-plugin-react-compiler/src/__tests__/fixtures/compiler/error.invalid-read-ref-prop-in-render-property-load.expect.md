
## Input

```javascript
// @validateRefAccessDuringRender @compilationMode:"infer"
function Component(props) {
  const value = props.ref.current;
  return <div>{value}</div>;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-read-ref-prop-in-render-property-load.ts:3:16
  1 | // @validateRefAccessDuringRender @compilationMode:"infer"
  2 | function Component(props) {
> 3 |   const value = props.ref.current;
    |                 ^^^^^^^^^^^^^^^^^ Cannot access ref value during render
  4 |   return <div>{value}</div>;
  5 | }
  6 |
```
          
      