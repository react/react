
## Input

```javascript
// @validateRefAccessDuringRender
function Component({cond}) {
  const ref = useRef(null);
  const x = cond ? ref : ref.current;
  return <Foo value={x} />;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-value-phi-with-ref.ts:4:25
  2 | function Component({cond}) {
  3 |   const ref = useRef(null);
> 4 |   const x = cond ? ref : ref.current;
    |                          ^^^^^^^^^^^ Cannot access ref value during render
  5 |   return <Foo value={x} />;
  6 | }
  7 |
```
          
      