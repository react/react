
## Input

```javascript
// Pattern 4: Bare Type(N) vs Primitive (no shapeId difference)
// Object method with sort/filter chain
// Divergence: TS has type:Type(21); Rust has type:Primitive

const formatNumber = function (x: number, y: number): number {
  return Math.round((x - y) * 1000);
};
const PerfHelper = {
  formatMetrics(): Metrics {
    const sortedLogs = logs.sort((entry1, entry2) => {}).filter();
    if (sortedLogs[0].begin < traceBeginTimeSec) {
    }
    sortedLogs.forEach((entry: TimeSliceEntry) => {});
  },
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Pattern 4: Bare Type(N) vs Primitive (no shapeId difference)
// Object method with sort/filter chain
// Divergence: TS has type:Type(21); Rust has type:Primitive

const formatNumber = function (x, y) {
  const $ = _c(3);
  let t0;
  if ($[0] !== x || $[1] !== y) {
    t0 = Math.round((x - y) * 1000);
    $[0] = x;
    $[1] = y;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
};

const PerfHelper = {
  formatMetrics(): Metrics {
    const sortedLogs = logs.sort((entry1, entry2) => {}).filter();
    if (sortedLogs[0].begin < traceBeginTimeSec) {
    }
    sortedLogs.forEach((entry: TimeSliceEntry) => {});
  },
};

```
      
### Eval output
(kind: exception) Fixture not implemented