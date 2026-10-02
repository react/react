// Track shell paint time. Race setTimeout with rAF to ensure we get a timestamp in background tabs.
function markShellTime() {
  // eslint-disable-next-line dot-notation
  if (typeof window['$RT'] !== 'number') {
    // eslint-disable-next-line dot-notation
    window['$RT'] = performance.now()
  }
}
requestAnimationFrame(markShellTime);
setTimeout(markShellTime);
