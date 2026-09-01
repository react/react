import {Stringify, useIdentity} from 'shared-runtime';

function Component() {
  const data = useIdentity(
    new Map([
      [0, 'value0'],
      [1, 'value1'],
    ])
  );
  const items = [];
  // NOTE: `i` is a context variable because it's reassigned and also referenced
  // within a closure, the `onClick` handler of each item
  // TODO: for loops create a unique environment on each iteration, which means
  // that if the iteration variable is only updated in the updater, the variable
  // is effectively const within the body and the "update" acts more like
  // a re-initialization than a reassignment.
  // Until we model this "new environment" semantic, we allow this case to error
  for (let i = MIN; i <= MAX; i += INCREMENT) {
    items.push(
      <Stringify key={i} onClick={() => data.get(i)} shouldInvokeFns={true} />
    );
  }
  return <>{items}</>;
}

const MIN = 0;
const MAX = 3;
const INCREMENT = 1;

export const FIXTURE_ENTRYPOINT = {
  params: [],
  fn: Component,
};
