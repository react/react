// Track the paint time of the shell.
// In hidden/occluded tabs rAF never fires; set $RT immediately so that
// completeBoundary falls back to the setTimeout flush path instead of
// scheduling a rAF that would never be called.
// See https://github.com/facebook/react/issues/36741
if (document.visibilityState === 'hidden') {
  // eslint-disable-next-line dot-notation
  window['$RT'] = performance.now();
} else {
  requestAnimationFrame(() => {
    // eslint-disable-next-line dot-notation
    window['$RT'] = performance.now();
  });
}
