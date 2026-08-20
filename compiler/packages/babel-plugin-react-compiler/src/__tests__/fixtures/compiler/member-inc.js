//@flow

component Foo() {
  let x = {a: 1};
  x.a++;
  x.a--;
  console.log(++x.a);
  console.log(x.a++);

  console.log(x.a);
  let y = x.a++;
  console.log(y);
  console.log(x.a);

  console.log((++x.a).toString(), (x.a++).toString(), x.a);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};
