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
