
## Input

```javascript
// @flow

component Foo() {
  const foo = useFoo();
  foo.current = true;
  return <div />;
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value returned from a hook is not allowed. Consider moving the modification into the hook where the value is constructed.

  3 | component Foo() {
  4 |   const foo = useFoo();
> 5 |   foo.current = true;
    |   ^^^ value cannot be modified
  6 |   return <div />;
  7 | }
  8 |

Hint: If this value is a Ref (value returned by `useRef()`), rename the variable to end in "Ref".
```
          
      