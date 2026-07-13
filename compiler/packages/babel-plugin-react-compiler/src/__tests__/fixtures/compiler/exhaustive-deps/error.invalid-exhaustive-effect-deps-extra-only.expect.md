
## Input

```javascript
// @validateExhaustiveEffectDependencies:"extra-only"
import {useEffect} from 'react';

function Component({x, y, z}) {
  // no error: missing dep not reported in extra-only mode
  useEffect(() => {
    log(x);
  }, []);

  // error: extra dep - y
  useEffect(() => {
    log(x);
  }, [x, y]);

  // error: extra dep - y (missing dep - z not reported)
  useEffect(() => {
    log(x, z);
  }, [x, y]);

  // error: extra dep - x.y
  useEffect(() => {
    log(x);
  }, [x.y]);
}

```


## Error

```
Found 3 errors:

Error: Found extra effect dependencies

Extra dependencies can cause an effect to fire more often than it should, resulting in performance problems such as excessive renders and side effects.

error.invalid-exhaustive-effect-deps-extra-only.ts:13:9
  11 |   useEffect(() => {
  12 |     log(x);
> 13 |   }, [x, y]);
     |          ^ Unnecessary dependency `y`
  14 |
  15 |   // error: extra dep - y (missing dep - z not reported)
  16 |   useEffect(() => {

Inferred dependencies: `[x]`

Error: Found extra effect dependencies

Extra dependencies can cause an effect to fire more often than it should, resulting in performance problems such as excessive renders and side effects.

error.invalid-exhaustive-effect-deps-extra-only.ts:18:9
  16 |   useEffect(() => {
  17 |     log(x, z);
> 18 |   }, [x, y]);
     |          ^ Unnecessary dependency `y`
  19 |
  20 |   // error: extra dep - x.y
  21 |   useEffect(() => {

Inferred dependencies: `[x, z]`

Error: Found extra effect dependencies

Extra dependencies can cause an effect to fire more often than it should, resulting in performance problems such as excessive renders and side effects.

error.invalid-exhaustive-effect-deps-extra-only.ts:23:6
  21 |   useEffect(() => {
  22 |     log(x);
> 23 |   }, [x.y]);
     |       ^^^ Overly precise dependency `x.y`, use `x` instead
  24 | }
  25 |

Inferred dependencies: `[x]`
```
          
      