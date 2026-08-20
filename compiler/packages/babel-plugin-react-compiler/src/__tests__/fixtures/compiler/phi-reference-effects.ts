import {arrayPush} from 'shared-runtime';

function Foo(cond) {
  let x = null;
  if (cond) {
    x = [];
  } else {
  }
  // Here, x = phi(x$null, x$[]) should receive a ValueKind of Mutable
  arrayPush(x, 2);

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{cond: true}],
  sequentialRenders: [{cond: true}, {cond: true}],
};
