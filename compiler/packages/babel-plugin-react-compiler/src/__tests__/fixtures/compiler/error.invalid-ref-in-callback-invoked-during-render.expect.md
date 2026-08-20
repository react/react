
## Input

```javascript
// @validateRefAccessDuringRender
function Component(props) {
  const ref = useRef(null);
  const renderItem = item => {
    const current = ref.current;
    return <Foo item={item} current={current} />;
  };
  return <Items>{props.items.map(item => renderItem(item))}</Items>;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-in-callback-invoked-during-render.ts:8:33
   6 |     return <Foo item={item} current={current} />;
   7 |   };
>  8 |   return <Items>{props.items.map(item => renderItem(item))}</Items>;
     |                                  ^^^^^^^^^^^^^^^^^^^^^^^^ Cannot access ref value during render
   9 | }
  10 |
```
          
      