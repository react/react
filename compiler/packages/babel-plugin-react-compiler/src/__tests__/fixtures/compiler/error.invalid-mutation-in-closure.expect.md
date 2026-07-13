
## Input

```javascript
function useInvalidMutation(options) {
  function test() {
    foo(options.foo); // error should not point on this line
    options.foo = 'bar';
  }
  return test;
}

```


## Error

```
Found 2 errors:

Error: This value cannot be modified

Modifying component props or hook arguments is not allowed. Consider using a local variable instead.

error.invalid-mutation-in-closure.ts:4:4
  2 |   function test() {
  3 |     foo(options.foo); // error should not point on this line
> 4 |     options.foo = 'bar';
    |     ^^^^^^^ `options` cannot be modified
  5 |   }
  6 |   return test;
  7 | }

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `options` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-mutation-in-closure.ts:6:9
  4 |     options.foo = 'bar';
  5 |   }
> 6 |   return test;
    |          ^^^^ This function may (indirectly) reassign or modify `options` after render
  7 | }
  8 |

error.invalid-mutation-in-closure.ts:4:4
  2 |   function test() {
  3 |     foo(options.foo); // error should not point on this line
> 4 |     options.foo = 'bar';
    |     ^^^^^^^ This modifies `options`
  5 |   }
  6 |   return test;
  7 | }
```
          
      