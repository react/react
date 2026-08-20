function useFoo() {}

function Foo() {
  let name = useFoo.name;
  console.log(name);
  return name;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};
