// Track the paint time of the shell.
// $RT must be a number before completeBoundary runs so that the existing
// setTimeout path is used instead of a requestAnimationFrame that may never
// fire when the document is hidden.
//
// Case A: tab is already hidden at shell-parse time — set $RT immediately.
// Case B: tab goes hidden after shell load but before the rAF fires — a
//         one-shot visibilitychange handler initialises $RT at that point.
// See https://github.com/facebook/react/issues/36741
if (document.visibilityState === 'hidden') {
  // eslint-disable-next-line dot-notation
  window['$RT'] = performance.now();
} else {
  requestAnimationFrame(() => {
    // eslint-disable-next-line dot-notation
    window['$RT'] = performance.now();
  });
  // Fallback for Case B: initialise $RT when the tab is hidden before the rAF fires.
  document.addEventListener('visibilitychange', function initRT() {
    // eslint-disable-next-line dot-notation
    if (typeof window['$RT'] !== 'number') {
      // eslint-disable-next-line dot-notation
      window['$RT'] = performance.now();
    }
    document.removeEventListener('visibilitychange', initRT);
  });
}
