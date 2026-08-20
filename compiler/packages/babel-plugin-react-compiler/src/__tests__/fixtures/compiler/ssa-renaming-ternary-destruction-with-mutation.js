import {mutate} from 'shared-runtime';

function useFoo(props) {
  let x = [];
  x.push(props.bar);
  props.cond ? (({x} = {x: {}}), ([x] = [[]]), x.push(props.foo)) : null;
  mutate(x);
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
