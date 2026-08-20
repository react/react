import {print} from 'shared-runtime';

function hoisting(cond) {
  if (cond) {
    const x = 1;
    print(x);
  }

  const x = 2;
  print(x);
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [false],
};
