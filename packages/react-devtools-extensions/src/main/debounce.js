function debounce(fn, timeout) {
  let executionTimeoutId = null;

  return (...args) => {
    clearTimeout(executionTimeoutId);
    executionTimeoutId = setTimeout(fn, timeout, ...args);
  };
}

export default debounce;
