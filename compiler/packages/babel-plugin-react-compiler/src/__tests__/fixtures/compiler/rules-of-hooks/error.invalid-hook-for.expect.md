
## Input

```javascript
function Component(props) {
  let i = 0;
  for (let x = 0; useHook(x) < 10; useHook(i), x++) {
    i += useHook(x);
  }
  return i;
}

```


## Error

```
Found 1 error:

Invariant: Unexpected empty block with `goto` terminal

Block bb5 is empty.

error.invalid-hook-for.ts:3:2
  1 | function Component(props) {
  2 |   let i = 0;
> 3 |   for (let x = 0; useHook(x) < 10; useHook(i), x++) {
    |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 4 |     i += useHook(x);
    | ^^^^^^^^^^^^^^^^^^^^
> 5 |   }
    | ^^^^ Unexpected empty block with `goto` terminal
  6 |   return i;
  7 | }
  8 |
```
          
      