function readParameter({['parameter-key']: parameter}) {
  return parameter;
}

function Component(props) {
  const {['declaration-key']: declared} = props;
  const {
    nested: {['nested-key']: nested},
  } = props;
  let reassigned;
  ({['assignment-key']: reassigned} = props);

  return [declared, reassigned, readParameter(props), nested];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      'declaration-key': 1,
      'assignment-key': 2,
      'parameter-key': 3,
      nested: {'nested-key': 4},
    },
  ],
  isComponent: true,
};
