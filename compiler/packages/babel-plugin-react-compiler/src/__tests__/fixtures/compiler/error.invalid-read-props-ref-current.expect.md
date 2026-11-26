
## Input

```javascript
function Component(props) {
  return <div>{props.ref.current}</div>;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-read-props-ref-current.ts:2:15
  1 | function Component(props) {
> 2 |   return <div>{props.ref.current}</div>;
    |                ^^^^^^^^^^^^^^^^^ Cannot access ref value during render
  3 | }
  4 |
```
          
      