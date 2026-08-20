// Track the paint time of the shell
requestAnimationFrame(() => {
  // eslint-disable-next-line dot-notation
  window['$RT'] = performance.now();
});
