function useFoo() {}
useFoo.useBar = function () {
  return 'foo';
};

function Foo() {
  let bar = useFoo.useBar;
  return bar();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};
