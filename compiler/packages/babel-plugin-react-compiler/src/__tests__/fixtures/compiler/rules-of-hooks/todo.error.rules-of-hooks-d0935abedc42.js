// @skip
// Unsupported input

// This is valid because "use"-prefixed functions called in
// unnamed function arguments are not assumed to be hooks.
React.unknownFunction((foo, bar) => {
  if (foo) {
    useNotAHook(bar);
  }
});
