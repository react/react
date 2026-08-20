function hoisting(cond) {
  let items = [];
  if (cond) {
    let foo = () => {
      items.push(bar());
    };
    let bar = () => true;
    foo();
  }
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [true],
  isComponent: false,
};
