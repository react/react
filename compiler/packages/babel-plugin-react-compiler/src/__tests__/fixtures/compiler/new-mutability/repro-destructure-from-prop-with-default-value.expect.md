
## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false
export function useFormatRelativeTime(opts = {}) {
  const {timeZone, minimal} = opts;
  const format = useCallback(function formatWithUnit() {}, [minimal]);
  // We previously recorded `{timeZone}` as capturing timeZone into the object,
  // then assumed that dateTimeFormat() mutates that object,
  // which in turn could mutate timeZone and the object it came from,
  // which meanteans that the value `minimal` is derived from can change.
  //
  // The fix was to record a Capture from a maybefrozen value as an ImmutableCapture
  // which doesn't propagate mutations
  dateTimeFormat({timeZone});
  return format;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateExhaustiveMemoizationDependencies:false
export function useFormatRelativeTime(t0) {
  const $ = _c(1);
  const opts = t0 === undefined ? {} : t0;
  const { timeZone, minimal } = opts;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = function formatWithUnit() {};
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  const format = t1;

  dateTimeFormat({ timeZone });
  return format;
}

```
      
### Eval output
(kind: exception) Fixture not implemented