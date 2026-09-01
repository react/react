
## Input

```javascript
function Component() {
  let callback = () => {
    onClick = () => {};
  };
  let onClick;

  return <div onClick={callback} />;
}

```


## Error

```
Found 2 errors:

Error: Cannot reassign variable after render completes

Reassigning `onClick` after render has completed can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.todo-function-expression-references-later-variable-declaration.ts:3:4
  1 | function Component() {
  2 |   let callback = () => {
> 3 |     onClick = () => {};
    |     ^^^^^^^ Cannot reassign `onClick` after render completes
  4 |   };
  5 |   let onClick;
  6 |

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `onClick` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.todo-function-expression-references-later-variable-declaration.ts:7:23
  5 |   let onClick;
  6 |
> 7 |   return <div onClick={callback} />;
    |                        ^^^^^^^^ This function may (indirectly) reassign or modify `onClick` after render
  8 | }
  9 |

error.todo-function-expression-references-later-variable-declaration.ts:3:4
  1 | function Component() {
  2 |   let callback = () => {
> 3 |     onClick = () => {};
    |     ^^^^^^^ This modifies `onClick`
  4 |   };
  5 |   let onClick;
  6 |
```
          
      