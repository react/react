
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees

// We technically do not need to bailout here if we can check
// `someHelper`'s reactive deps are a subset of depslist from
// source. This check is somewhat incompatible with our current
// representation of manual memoization in HIR, so we bail out
// for now.
function Component(props) {
  const x = useMemo(someHelper, []);
  return x;
}

```


## Error

```
Found 1 error:

Error: Expected the first argument to be an inline function expression

Expected the first argument to be an inline function expression.

error.validate-useMemo-named-function.ts:9:20
   7 | // for now.
   8 | function Component(props) {
>  9 |   const x = useMemo(someHelper, []);
     |                     ^^^^^^^^^^ Expected the first argument to be an inline function expression
  10 |   return x;
  11 | }
  12 |
```
          
      