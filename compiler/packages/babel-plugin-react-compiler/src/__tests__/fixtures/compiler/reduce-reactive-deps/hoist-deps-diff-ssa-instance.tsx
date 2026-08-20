import {makeObject_Primitives, setPropertyByKey} from 'shared-runtime';

function useFoo({value, cond}) {
  let x: any = makeObject_Primitives();
  if (cond) {
    setPropertyByKey(x, 'a', null);
  } else {
    setPropertyByKey(x, 'a', {b: 2});
  }

  /**
   * y should take a dependency on `x`, not `x.a.b` here
   */
  const y = [];
  if (!cond) {
    y.push(x.a.b);
  }

  x = makeObject_Primitives();
  setPropertyByKey(x, 'a', {b: value});

  return [y, x.a.b];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{value: 3, cond: true}],
  sequentialRenders: [
    {value: 3, cond: true},
    {value: 3, cond: false},
  ],
};
