function Component(props) {
  let x;
  const object = {...props.value};
  for (const y in object) {
    if (y === 'break') {
      break;
    }
    x = object[y];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  // should return 'a'
  params: [{a: 'a', break: null, c: 'C!'}],
};
