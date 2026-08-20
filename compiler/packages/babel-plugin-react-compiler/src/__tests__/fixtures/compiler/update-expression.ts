function foo(props: {x: number}) {
  let x = props.x;
  let y = x++;
  let z = x--;
  return {x, y, z};
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{x: 1}],
  isComponent: false,
};
