// @compilationMode:"infer"
function Component() {
  'use memo';
  const x = {
    outer() {
      const y = {
        inner() {
          return useFoo();
        },
      };
      return y;
    },
  };
  return x;
}
