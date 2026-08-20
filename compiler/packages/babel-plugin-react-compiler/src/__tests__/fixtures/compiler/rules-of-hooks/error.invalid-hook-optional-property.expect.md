
## Input

```javascript
function Component() {
  const {result} = Module?.useConditionalHook() ?? {};
  return result;
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-hook-optional-property.ts:2:19
  1 | function Component() {
> 2 |   const {result} = Module?.useConditionalHook() ?? {};
    |                    ^^^^^^^^^^^^^^^^^^^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  3 |   return result;
  4 | }
  5 |
```
          
      