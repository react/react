// @compilationMode:"annotation"
while (
  function useFoo() {
    'use memo';
    return [1, 2, 3];
  }
) {
  break;
}
