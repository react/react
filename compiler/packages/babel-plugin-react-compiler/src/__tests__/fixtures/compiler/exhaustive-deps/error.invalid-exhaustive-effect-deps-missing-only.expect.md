
## Input

```javascript
// @validateExhaustiveEffectDependencies:"missing-only"
import {useEffect} from 'react';

function Component({x, y, z}) {
  // error: missing dep - x
  useEffect(() => {
    log(x);
  }, []);

  // no error: extra dep not reported in missing-only mode
  useEffect(() => {
    log(x);
  }, [x, y]);

  // error: missing dep - z (extra dep - y not reported)
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
Found 3 errors:

Error: Found missing effect dependencies

Missing dependencies can cause an effect to fire less often than it should.

error.invalid-exhaustive-effect-deps-missing-only.ts:7:8
   5 |   // error: missing dep - x
   6 |   useEffect(() => {
>  7 |     log(x);
     |         ^ Missing dependency `x`
   8 |   }, []);
   9 |
  10 |   // no error: extra dep not reported in missing-only mode

Inferred dependencies: `[x]`

Error: Found missing effect dependencies

Missing dependencies can cause an effect to fire less often than it should.

error.invalid-exhaustive-effect-deps-missing-only.ts:17:11
  15 |   // error: missing dep - z (extra dep - y not reported)
  16 |   useEffect(() => {
> 17 |     log(x, z);
     |            ^ Missing dependency `z`
  18 |   }, [x, y]);
  19 |
  20 |   // error: missing dep x

Inferred dependencies: `[x, z]`

Error: Found missing effect dependencies

Missing dependencies can cause an effect to fire less often than it should.

error.invalid-exhaustive-effect-deps-missing-only.ts:22:8
  20 |   // error: missing dep x
  21 |   useEffect(() => {
> 22 |     log(x);
     |         ^ Missing dependency `x`
  23 |   }, [x.y]);
  24 | }
  25 |

Inferred dependencies: `[x]`
```
          
      