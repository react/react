function Component() {
  const a = [];
  const b = a;
  useFreeze(a);
  foo(b); // should be readonly, value is guaranteed frozen via alias
  return b;
}

function useFreeze() {}
function foo(x) {}
