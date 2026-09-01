
## Input

```javascript
// @validateRefAccessDuringRender
function Component(props) {
  const ref = useRef(null);
  const renderItem = item => {
    const aliasedRef = ref;
    const current = aliasedRef.current;
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

error.invalid-aliased-ref-in-callback-invoked-during-render-.ts:9:33
   7 |     return <Foo item={item} current={current} />;
   8 |   };
>  9 |   return <Items>{props.items.map(item => renderItem(item))}</Items>;
     |                                  ^^^^^^^^^^^^^^^^^^^^^^^^ Cannot access ref value during render
  10 | }
  11 |
```
          
      