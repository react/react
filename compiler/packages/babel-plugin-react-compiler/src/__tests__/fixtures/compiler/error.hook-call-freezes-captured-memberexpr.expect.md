
## Input

```javascript
// @enableTransitivelyFreezeFunctionExpressions
import {mutate, Stringify, useIdentity} from 'shared-runtime';

function Foo({count}) {
  const x = {value: 0};
  /**
   * After this custom hook call, it's no longer valid to mutate x.
   */
  const cb = useIdentity(() => {
    x.value++;
  });

  x.value += count;
  return <Stringify x={x} cb={cb} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{count: 1}],
};

```


## Error

```
Found 2 errors:

Error: This value cannot be modified

Modifying a value previously passed as an argument to a hook is not allowed. Consider moving the modification before calling the hook.

error.hook-call-freezes-captured-memberexpr.ts:13:2
  11 |   });
  12 |
> 13 |   x.value += count;
     |   ^ value cannot be modified
  14 |   return <Stringify x={x} cb={cb} />;
  15 | }
  16 |

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `x` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.hook-call-freezes-captured-memberexpr.ts:9:25
   7 |    * After this custom hook call, it's no longer valid to mutate x.
   8 |    */
>  9 |   const cb = useIdentity(() => {
     |                          ^^^^^^^
> 10 |     x.value++;
     | ^^^^^^^^^^^^^^
> 11 |   });
     | ^^^^ This function may (indirectly) reassign or modify `x` after render
  12 |
  13 |   x.value += count;
  14 |   return <Stringify x={x} cb={cb} />;

error.hook-call-freezes-captured-memberexpr.ts:10:4
   8 |    */
   9 |   const cb = useIdentity(() => {
> 10 |     x.value++;
     |     ^ This modifies `x`
  11 |   });
  12 |
  13 |   x.value += count;
```
          
      