
## Input

```javascript
// @validateNoRefAccessInRender

function Component({Observer}) {
  const ref = useRef(null);
  return new Observer(ref);
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-in-unknown-constructor.ts:5:22
  3 | function Component({Observer}) {
  4 |   const ref = useRef(null);
> 5 |   return new Observer(ref);
    |                       ^^^ Passing a ref to a function may read its value during render
  6 | }
  7 |
```
          
      