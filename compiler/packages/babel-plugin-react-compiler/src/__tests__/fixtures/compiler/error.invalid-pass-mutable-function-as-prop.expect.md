
## Input

```javascript
// @validateNoFreezingKnownMutableFunctions
function Component() {
  const cache = new Map();
  const fn = () => {
    cache.set('key', 'value');
  };
  return <Foo fn={fn} />;
}

```


## Error

```
Found 1 error:

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `cache` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-pass-mutable-function-as-prop.ts:7:18
  5 |     cache.set('key', 'value');
  6 |   };
> 7 |   return <Foo fn={fn} />;
    |                   ^^ This function may (indirectly) reassign or modify `cache` after render
  8 | }
  9 |

error.invalid-pass-mutable-function-as-prop.ts:5:4
  3 |   const cache = new Map();
  4 |   const fn = () => {
> 5 |     cache.set('key', 'value');
    |     ^^^^^ This modifies `cache`
  6 |   };
  7 |   return <Foo fn={fn} />;
  8 | }
```
          
      