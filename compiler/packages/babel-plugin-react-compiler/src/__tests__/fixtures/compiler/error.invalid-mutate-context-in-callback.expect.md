
## Input

```javascript
function Component(props) {
  const FooContext = useContext(Foo);
  // This function should be memoized, but its mutable range is entangled
  // with the useContext call. We can't memoize hooks, therefore the
  // reactive scope around the hook + callback is pruned and we're left
  // w no memoization of the callback.
  //
  // Ideally we'd determine that this isn't called during render and can
  // therefore be considered "immutable" or otherwise safe to memoize
  // independently
  const onClick = () => {
    FooContext.current = true;
  };
  return <div onClick={onClick} />;
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value returned from 'useContext()' is not allowed..

error.invalid-mutate-context-in-callback.ts:12:4
  10 |   // independently
  11 |   const onClick = () => {
> 12 |     FooContext.current = true;
     |     ^^^^^^^^^^ `FooContext` cannot be modified
  13 |   };
  14 |   return <div onClick={onClick} />;
  15 | }

Hint: If this value is a Ref (value returned by `useRef()`), rename the variable to end in "Ref".
```
          
      