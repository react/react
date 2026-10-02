function Component(props) {
  const optedOut = x => {
    'use no memo';
    const inner = y => y + 1;
    return inner(x);
  };
  const outlined = x => x * 2;
  return [optedOut(props.value), outlined(props.value)];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};
