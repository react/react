// @enablePropagateDepsInHIR
function Component(props) {
  let x = 0;
  const values = [];
  const y = props.a || props.b;
  values.push(y);
  if (props.c) {
    x = 1;
  }
  values.push(x);
  if (props.d) {
    x = 2;
  }
  values.push(x);
  return values;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 1, c: true, d: true}],
  sequentialRenders: [
    {a: 0, b: 1, c: true, d: true},
    {a: 4, b: 1, c: true, d: true},
    {a: 4, b: 1, c: false, d: true},
    {a: 4, b: 1, c: false, d: false},
  ],
};
