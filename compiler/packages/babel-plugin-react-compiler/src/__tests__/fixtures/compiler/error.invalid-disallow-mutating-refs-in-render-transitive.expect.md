
## Input

```javascript
// @validateRefAccessDuringRender
function Component() {
  const ref = useRef(null);

  const setRef = () => {
    ref.current = false;
  };
  const changeRef = setRef;
  changeRef();

  return <button ref={ref} />;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-disallow-mutating-refs-in-render-transitive.ts:9:2
   7 |   };
   8 |   const changeRef = setRef;
>  9 |   changeRef();
     |   ^^^^^^^^^ This function accesses a ref value
  10 |
  11 |   return <button ref={ref} />;
  12 | }
```
          
      