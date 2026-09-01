
## Input

```javascript
function Component() {
  // Cannot assign to globals
  someUnknownGlobal = true;
  moduleLocal = true;
}

```


## Error

```
Found 2 errors:

Error: Cannot reassign variables declared outside of the component/hook

Variable `someUnknownGlobal` is declared outside of the component/hook. Reassigning this value during render is a form of side effect, which can cause unpredictable behavior depending on when the component happens to re-render. If this variable is used in rendering, use useState instead. Otherwise, consider updating it in an effect. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#side-effects-must-run-outside-of-render).

error.reassignment-to-global.ts:3:2
  1 | function Component() {
  2 |   // Cannot assign to globals
> 3 |   someUnknownGlobal = true;
    |   ^^^^^^^^^^^^^^^^^ `someUnknownGlobal` cannot be reassigned
  4 |   moduleLocal = true;
  5 | }
  6 |

Error: Cannot reassign variables declared outside of the component/hook

Variable `moduleLocal` is declared outside of the component/hook. Reassigning this value during render is a form of side effect, which can cause unpredictable behavior depending on when the component happens to re-render. If this variable is used in rendering, use useState instead. Otherwise, consider updating it in an effect. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#side-effects-must-run-outside-of-render).

error.reassignment-to-global.ts:4:2
  2 |   // Cannot assign to globals
  3 |   someUnknownGlobal = true;
> 4 |   moduleLocal = true;
    |   ^^^^^^^^^^^ `moduleLocal` cannot be reassigned
  5 | }
  6 |
```
          
      