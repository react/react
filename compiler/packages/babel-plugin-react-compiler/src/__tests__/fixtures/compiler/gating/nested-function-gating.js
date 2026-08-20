// @gating @compilationMode:"annotation"
if (globalThis.__DEV__) {
  function useFoo() {
    'use memo';
    return [1, 2, 3];
  }
}
