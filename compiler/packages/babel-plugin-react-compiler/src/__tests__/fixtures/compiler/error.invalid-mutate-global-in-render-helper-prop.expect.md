
## Input

```javascript
function Component() {
  const renderItem = item => {
    // Normally we assume that it's safe to mutate globals in a function passed
    // as a prop, because the prop could be used as an event handler or effect.
    // But if the function returns JSX we can assume it's a render helper, ie
    // called during render, and thus it's unsafe to mutate globals or call
    // other impure code.
    global.property = true;
    return <Item item={item} value={rand} />;
  };
  return <ItemList renderItem={renderItem} />;
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a variable defined outside a component or hook is not allowed. Consider using an effect.

error.invalid-mutate-global-in-render-helper-prop.ts:8:4
   6 |     // called during render, and thus it's unsafe to mutate globals or call
   7 |     // other impure code.
>  8 |     global.property = true;
     |     ^^^^^^ value cannot be modified
   9 |     return <Item item={item} value={rand} />;
  10 |   };
  11 |   return <ItemList renderItem={renderItem} />;
```
          
      