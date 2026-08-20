// @customMacros:"idx"
import idx from 'idx';

function Component(props) {
  // the lambda should not be outlined
  const groupName = idx(props, _ => _.group.label);
  return <div>{groupName}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
