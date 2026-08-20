import {mutate, setProperty, throwErrorWithMessageIf} from 'shared-runtime';

function useFoo({value, cond}) {
  let y = [value];
  let x = {cond};

  try {
    mutate(x);
    throwErrorWithMessageIf(x.cond, 'error');
  } catch {
    setProperty(x, 'henderson');
    return x;
  }
  setProperty(x, 'nevada');
  y.push(x);

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{value: 4, cond: true}],
  sequentialRenders: [
    {value: 4, cond: true},
    {value: 5, cond: true},
    {value: 5, cond: false},
  ],
};
