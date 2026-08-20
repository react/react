
## Input

```javascript
// @enableTransitivelyFreezeFunctionExpressions
import {setPropertyByKey, Stringify, useIdentity} from 'shared-runtime';

function Foo({count}) {
  const x = {value: 0};
  /**
   * After this custom hook call, it's no longer valid to mutate x.
   */
  const cb = useIdentity(() => {
    setPropertyByKey(x, 'value', count);
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
Found 1 error:

Error: This value cannot be modified

Modifying a value previously passed as an argument to a hook is not allowed. Consider moving the modification before calling the hook.

error.hook-call-freezes-captured-identifier.ts:13:2
  11 |   });
  12 |
> 13 |   x.value += count;
     |   ^ value cannot be modified
  14 |   return <Stringify x={x} cb={cb} />;
  15 | }
  16 |
```
          
      