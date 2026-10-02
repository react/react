// @gating

const FooBeforeDeclaration = Foo;

function callFoo() {
  'use no memo';
  return FooBeforeDeclaration('first', 'second');
}

function Foo(first) {
  'use memo';
  return [first, arguments[1], arguments.length];
}

export const FIXTURE_ENTRYPOINT = {
  fn: callFoo,
  params: [],
};
