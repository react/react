
## Input

```javascript
// @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
let cond = true;
function Component(props) {
  let a;
  let b;
  const f = () => {
    if (cond) {
      a = {};
      b = [];
    } else {
      a = {};
      b = [];
    }
    a.property = true;
    b.push(false);
  };
  return <div onClick={f} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```


## Error

```
Found 2 errors:

Error: Cannot reassign variable after render completes

Reassigning `a` after render has completed can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.mutable-range-shared-inner-outer-function.ts:8:6
   6 |   const f = () => {
   7 |     if (cond) {
>  8 |       a = {};
     |       ^ Cannot reassign `a` after render completes
   9 |       b = [];
  10 |     } else {
  11 |       a = {};

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `a` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.mutable-range-shared-inner-outer-function.ts:17:23
  15 |     b.push(false);
  16 |   };
> 17 |   return <div onClick={f} />;
     |                        ^ This function may (indirectly) reassign or modify `a` after render
  18 | }
  19 |
  20 | export const FIXTURE_ENTRYPOINT = {

error.mutable-range-shared-inner-outer-function.ts:8:6
   6 |   const f = () => {
   7 |     if (cond) {
>  8 |       a = {};
     |       ^ This modifies `a`
   9 |       b = [];
  10 |     } else {
  11 |       a = {};
```
          
      