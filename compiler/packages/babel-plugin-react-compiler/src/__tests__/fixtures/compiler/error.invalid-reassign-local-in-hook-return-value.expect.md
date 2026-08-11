
## Input

```javascript
function useFoo() {
  let x = 0;
  return value => {
    x = value;
  };
}

```


## Error

```
Found 2 errors:

Error: Cannot reassign variable after render completes

Reassigning `x` after render has completed can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-reassign-local-in-hook-return-value.ts:4:4
  2 |   let x = 0;
  3 |   return value => {
> 4 |     x = value;
    |     ^ Cannot reassign `x` after render completes
  5 |   };
  6 | }
  7 |

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `x` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-reassign-local-in-hook-return-value.ts:3:9
  1 | function useFoo() {
  2 |   let x = 0;
> 3 |   return value => {
    |          ^^^^^^^^^^
> 4 |     x = value;
    | ^^^^^^^^^^^^^^
> 5 |   };
    | ^^^^ This function may (indirectly) reassign or modify `x` after render
  6 | }
  7 |

error.invalid-reassign-local-in-hook-return-value.ts:4:4
  2 |   let x = 0;
  3 |   return value => {
> 4 |     x = value;
    |     ^ This modifies `x`
  5 |   };
  6 | }
  7 |
```
          
      