
## Input

```javascript
// @validateRefAccessDuringRender
function Component(props) {
  const ref = useRef(null);
  ref.current = props.value;
  return ref.current;
}

```


## Error

```
Found 2 errors:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-set-and-read-ref-during-render.ts:4:2
  2 | function Component(props) {
  3 |   const ref = useRef(null);
> 4 |   ref.current = props.value;
    |   ^^^^^^^^^^^ Cannot update ref during render
  5 |   return ref.current;
  6 | }
  7 |

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-set-and-read-ref-during-render.ts:5:9
  3 |   const ref = useRef(null);
  4 |   ref.current = props.value;
> 5 |   return ref.current;
    |          ^^^^^^^^^^^ Cannot access ref value during render
  6 | }
  7 |
```
          
      