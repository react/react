
## Input

```javascript
// @validateExhaustiveEffectDependencies:"all"
import {useEffect} from 'react';

function Component({x, y, z}) {
  // error: missing dep - x
  useEffect(() => {
    log(x);
  }, []);

  // error: extra dep - y
  useEffect(() => {
    log(x);
  }, [x, y]);

  // error: missing dep - z; extra dep - y
  useEffect(() => {
    log(x, z);
  }, [x, y]);

  // error: missing dep x
  useEffect(() => {
    log(x);
  }, [x.y]);
}

```


## Error

```
Found 4 errors:

Error: Found missing effect dependencies

Missing dependencies can cause an effect to fire less often than it should.

error.invalid-exhaustive-effect-deps.ts:7:8
   5 |   // error: missing dep - x
   6 |   useEffect(() => {
>  7 |     log(x);
     |         ^ Missing dependency `x`
   8 |   }, []);
   9 |
  10 |   // error: extra dep - y

Inferred dependencies: `[x]`

Error: Found extra effect dependencies

Extra dependencies can cause an effect to fire more often than it should, resulting in performance problems such as excessive renders and side effects.

error.invalid-exhaustive-effect-deps.ts:13:9
  11 |   useEffect(() => {
  12 |     log(x);
> 13 |   }, [x, y]);
     |          ^ Unnecessary dependency `y`
  14 |
  15 |   // error: missing dep - z; extra dep - y
  16 |   useEffect(() => {

Inferred dependencies: `[x]`

Error: Found missing/extra effect dependencies

Missing dependencies can cause an effect to fire less often than it should. Extra dependencies can cause an effect to fire more often than it should, resulting in performance problems such as excessive renders and side effects.

error.invalid-exhaustive-effect-deps.ts:17:11
  15 |   // error: missing dep - z; extra dep - y
  16 |   useEffect(() => {
> 17 |     log(x, z);
     |            ^ Missing dependency `z`
  18 |   }, [x, y]);
  19 |
  20 |   // error: missing dep x

error.invalid-exhaustive-effect-deps.ts:18:9
  16 |   useEffect(() => {
  17 |     log(x, z);
> 18 |   }, [x, y]);
     |          ^ Unnecessary dependency `y`
  19 |
  20 |   // error: missing dep x
  21 |   useEffect(() => {

Inferred dependencies: `[x, z]`

Error: Found missing/extra effect dependencies

Missing dependencies can cause an effect to fire less often than it should. Extra dependencies can cause an effect to fire more often than it should, resulting in performance problems such as excessive renders and side effects.

error.invalid-exhaustive-effect-deps.ts:22:8
  20 |   // error: missing dep x
  21 |   useEffect(() => {
> 22 |     log(x);
     |         ^ Missing dependency `x`
  23 |   }, [x.y]);
  24 | }
  25 |

error.invalid-exhaustive-effect-deps.ts:23:6
  21 |   useEffect(() => {
  22 |     log(x);
> 23 |   }, [x.y]);
     |       ^^^ Overly precise dependency `x.y`, use `x` instead
  24 | }
  25 |

Inferred dependencies: `[x]`
```
          
      