
## Input

```javascript
// @validateExhaustiveMemoizationDependencies
import {useMemo} from 'react';
import {Stringify} from 'shared-runtime';

function Component({x, y, z}) {
  const a = useMemo(() => {
    return x?.y.z?.a;
    // error: too precise
  }, [x?.y.z?.a.b]);
  const b = useMemo(() => {
    return x.y.z?.a;
    // ok, not our job to type check nullability
  }, [x.y.z.a]);
  const c = useMemo(() => {
    return x?.y.z.a?.b;
    // error: too precise
  }, [x?.y.z.a?.b.z]);
  const d = useMemo(() => {
    return x?.y?.[(console.log(y), z?.b)];
    // ok
  }, [x?.y, y, z?.b]);
  const e = useMemo(() => {
    const e = [];
    e.push(x);
    return e;
    // ok
  }, [x]);
  const f = useMemo(() => {
    return [];
    // error: unnecessary
  }, [x, y.z, z?.y?.a, UNUSED_GLOBAL]);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref = z ? ref1 : ref2;
  const cb = useMemo(() => {
    return () => {
      return ref.current;
    };
    // error: ref is a stable type but reactive
  }, []);
  return <Stringify results={[a, b, c, d, e, f, cb]} />;
}

```


## Error

```
Found 4 errors:

Error: Found missing/extra memoization dependencies

Missing dependencies can cause a value to update less often than it should, resulting in stale UI. Extra dependencies can cause a value to update more often than it should, resulting in performance problems such as excessive renders or effects firing too often.

error.invalid-exhaustive-deps.ts:7:11
   5 | function Component({x, y, z}) {
   6 |   const a = useMemo(() => {
>  7 |     return x?.y.z?.a;
     |            ^^^^^^^^^ Missing dependency `x?.y.z?.a`
   8 |     // error: too precise
   9 |   }, [x?.y.z?.a.b]);
  10 |   const b = useMemo(() => {

error.invalid-exhaustive-deps.ts:9:6
   7 |     return x?.y.z?.a;
   8 |     // error: too precise
>  9 |   }, [x?.y.z?.a.b]);
     |       ^^^^^^^^^^^ Overly precise dependency `x?.y.z?.a.b`, use `x?.y.z?.a` instead
  10 |   const b = useMemo(() => {
  11 |     return x.y.z?.a;
  12 |     // ok, not our job to type check nullability

Inferred dependencies: `[x?.y.z?.a]`

Error: Found missing/extra memoization dependencies

Missing dependencies can cause a value to update less often than it should, resulting in stale UI. Extra dependencies can cause a value to update more often than it should, resulting in performance problems such as excessive renders or effects firing too often.

error.invalid-exhaustive-deps.ts:15:11
  13 |   }, [x.y.z.a]);
  14 |   const c = useMemo(() => {
> 15 |     return x?.y.z.a?.b;
     |            ^^^^^^^^^^^ Missing dependency `x?.y.z.a?.b`
  16 |     // error: too precise
  17 |   }, [x?.y.z.a?.b.z]);
  18 |   const d = useMemo(() => {

error.invalid-exhaustive-deps.ts:17:6
  15 |     return x?.y.z.a?.b;
  16 |     // error: too precise
> 17 |   }, [x?.y.z.a?.b.z]);
     |       ^^^^^^^^^^^^^ Overly precise dependency `x?.y.z.a?.b.z`, use `x?.y.z.a?.b` instead
  18 |   const d = useMemo(() => {
  19 |     return x?.y?.[(console.log(y), z?.b)];
  20 |     // ok

Inferred dependencies: `[x?.y.z.a?.b]`

Error: Found extra memoization dependencies

Extra dependencies can cause a value to update more often than it should, resulting in performance problems such as excessive renders or effects firing too often.

error.invalid-exhaustive-deps.ts:31:6
  29 |     return [];
  30 |     // error: unnecessary
> 31 |   }, [x, y.z, z?.y?.a, UNUSED_GLOBAL]);
     |       ^ Unnecessary dependency `x`
  32 |   const ref1 = useRef(null);
  33 |   const ref2 = useRef(null);
  34 |   const ref = z ? ref1 : ref2;

error.invalid-exhaustive-deps.ts:31:9
  29 |     return [];
  30 |     // error: unnecessary
> 31 |   }, [x, y.z, z?.y?.a, UNUSED_GLOBAL]);
     |          ^^^ Unnecessary dependency `y.z`
  32 |   const ref1 = useRef(null);
  33 |   const ref2 = useRef(null);
  34 |   const ref = z ? ref1 : ref2;

error.invalid-exhaustive-deps.ts:31:14
  29 |     return [];
  30 |     // error: unnecessary
> 31 |   }, [x, y.z, z?.y?.a, UNUSED_GLOBAL]);
     |               ^^^^^^^ Unnecessary dependency `z?.y?.a`
  32 |   const ref1 = useRef(null);
  33 |   const ref2 = useRef(null);
  34 |   const ref = z ? ref1 : ref2;

error.invalid-exhaustive-deps.ts:31:23
  29 |     return [];
  30 |     // error: unnecessary
> 31 |   }, [x, y.z, z?.y?.a, UNUSED_GLOBAL]);
     |                        ^^^^^^^^^^^^^ Unnecessary dependency `UNUSED_GLOBAL`. Values declared outside of a component/hook should not be listed as dependencies as the component will not re-render if they change
  32 |   const ref1 = useRef(null);
  33 |   const ref2 = useRef(null);
  34 |   const ref = z ? ref1 : ref2;

Inferred dependencies: `[]`

Error: Found missing memoization dependencies

Missing dependencies can cause a value to update less often than it should, resulting in stale UI.

error.invalid-exhaustive-deps.ts:37:13
  35 |   const cb = useMemo(() => {
  36 |     return () => {
> 37 |       return ref.current;
     |              ^^^ Missing dependency `ref`. Refs, setState functions, and other "stable" values generally do not need to be added as dependencies, but this variable may change over time to point to different values
  38 |     };
  39 |     // error: ref is a stable type but reactive
  40 |   }, []);

Inferred dependencies: `[ref]`
```
          
      