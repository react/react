// @enablePropagateDepsInHIR @enableNewMutationAliasingModel
function useFoo(props) {
  let x = [];
  x.push(props.bar);
  // todo: the below should memoize separately from the above
  // my guess is that the phi causes the different `x` identifiers
  // to get added to an alias group. this is where we need to track
  // the actual state of the alias groups at the time of the mutation
  props.cond ? (({x} = {x: {}}), ([x] = [[]]), x.push(props.foo)) : null;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{cond: false, foo: 2, bar: 55}],
  sequentialRenders: [
    {cond: false, foo: 2, bar: 55},
    {cond: false, foo: 3, bar: 55},
    {cond: true, foo: 3, bar: 55},
  ],
};
