import {identity} from 'shared-runtime';

function Component({data}) {
  let x = 0;
  for (const item of data) {
    const {current, other} = item;
    x += current;
    identity(other);
  }
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      data: [
        {current: 2, other: 3},
        {current: 4, other: 5},
      ],
    },
  ],
};
