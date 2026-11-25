
## Input

```javascript
// @gating
import {useMemo} from 'react';

/**
 * TypeScript overload signatures reference `useDouble` before its
 * implementation, so gating takes the hoisted-wrapper path. The module must
 * still export `useDouble` (the gated wrapper), not only `useDouble_unoptimized`.
 */
export function useDouble(value: number): number;
export function useDouble(value: string): string;
export function useDouble(value: number | string): number | string {
  return useMemo(
    () => (typeof value === 'number' ? value * 2 : value + value),
    [value],
  );
}

function Component({value}: {value: number}) {
  const doubled = useDouble(value);
  return <div>{doubled}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 2}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { isForgetEnabled_Fixtures } from "ReactForgetFeatureFlag"; // @gating
import { useMemo } from "react";

/**
 * TypeScript overload signatures reference `useDouble` before its
 * implementation, so gating takes the hoisted-wrapper path. The module must
 * still export `useDouble` (the gated wrapper), not only `useDouble_unoptimized`.
 */
export function useDouble(value: number): number;
export function useDouble(value: string): string;
const isForgetEnabled_Fixtures_result = isForgetEnabled_Fixtures();
function useDouble_optimized(value) {
  return typeof value === "number" ? value * 2 : value + value;
}
function useDouble_unoptimized(value: number | string): number | string {
  return useMemo(
    () => (typeof value === "number" ? value * 2 : value + value),
    [value],
  );
}
export function useDouble(arg0) {
  if (isForgetEnabled_Fixtures_result) return useDouble_optimized(arg0);
  else return useDouble_unoptimized(arg0);
}
const Component = isForgetEnabled_Fixtures()
  ? function Component(t0) {
      const $ = _c(2);
      const { value } = t0;
      const doubled = useDouble(value);
      let t1;
      if ($[0] !== doubled) {
        t1 = <div>{doubled}</div>;
        $[0] = doubled;
        $[1] = t1;
      } else {
        t1 = $[1];
      }
      return t1;
    }
  : function Component({ value }: { value: number }) {
      const doubled = useDouble(value);
      return <div>{doubled}</div>;
    };

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 2 }],
};

```
      
### Eval output
(kind: ok) <div>4</div>