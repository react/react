
## Input

```javascript
function Component() {
  const x = 0;
  x = 1;
}

```


## Error

```
Found 1 error:

Error: Cannot reassign a `const` variable

`x` is declared as const.

error.invalid-reassign-const.ts:3:2
  1 | function Component() {
  2 |   const x = 0;
> 3 |   x = 1;
    |   ^ Cannot reassign a `const` variable
  4 | }
  5 |
```
          
      