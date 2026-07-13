
## Input

```javascript
// @validateExhaustiveEffectDependencies:"all"
import {useEffect, useEffectEvent} from 'react';

function Component({x, y, z}) {
  const effectEvent = useEffectEvent(() => {
    log(x);
  });

  const effectEvent2 = useEffectEvent(z => {
    log(y, z);
  });

  // error - do not include effect event in deps
  useEffect(() => {
    effectEvent();
  }, [effectEvent]);

  // error - do not include effect event in deps
  useEffect(() => {
    effectEvent2(z);
  }, [effectEvent2, z]);

  // error - do not include effect event captured values in deps
  useEffect(() => {
    effectEvent2(z);
  }, [y, z]);
}

```


## Error

```
Found 3 errors:

Error: Found extra effect dependencies

Extra dependencies can cause an effect to fire more often than it should, resulting in performance problems such as excessive renders and side effects.

error.exhaustive-deps-effect-events.ts:16:6
  14 |   useEffect(() => {
  15 |     effectEvent();
> 16 |   }, [effectEvent]);
     |       ^^^^^^^^^^^ Functions returned from `useEffectEvent` must not be included in the dependency array. Remove `effectEvent` from the dependencies.
  17 |
  18 |   // error - do not include effect event in deps
  19 |   useEffect(() => {

Inferred dependencies: `[]`

Error: Found extra effect dependencies

Extra dependencies can cause an effect to fire more often than it should, resulting in performance problems such as excessive renders and side effects.

error.exhaustive-deps-effect-events.ts:21:6
  19 |   useEffect(() => {
  20 |     effectEvent2(z);
> 21 |   }, [effectEvent2, z]);
     |       ^^^^^^^^^^^^ Functions returned from `useEffectEvent` must not be included in the dependency array. Remove `effectEvent2` from the dependencies.
  22 |
  23 |   // error - do not include effect event captured values in deps
  24 |   useEffect(() => {

Inferred dependencies: `[z]`

Error: Found extra effect dependencies

Extra dependencies can cause an effect to fire more often than it should, resulting in performance problems such as excessive renders and side effects.

error.exhaustive-deps-effect-events.ts:26:6
  24 |   useEffect(() => {
  25 |     effectEvent2(z);
> 26 |   }, [y, z]);
     |       ^ Unnecessary dependency `y`
  27 | }
  28 |

Inferred dependencies: `[z]`
```
          
      