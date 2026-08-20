import {mutate} from 'shared-runtime';

function useFoo(props) {
  let x = [];
  x.push(props.bar);
  if (props.cond) {
    x = {};
    x = [];
    x.push(props.foo);
  }
  mutate(x);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{bar: 'bar', foo: 'foo', cond: true}],
  sequentialRenders: [
    {bar: 'bar', foo: 'foo', cond: true},
    {bar: 'bar', foo: 'foo', cond: true},
    {bar: 'bar', foo: 'foo', cond: false},
  ],
};
