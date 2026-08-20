function hoisting(cond) {
  let items = [];
  if (cond) {
    const foo = () => {
      items.push(bar());
    };
    const bar = () => true;
    foo();
  }
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [true],
  isComponent: false,
};
