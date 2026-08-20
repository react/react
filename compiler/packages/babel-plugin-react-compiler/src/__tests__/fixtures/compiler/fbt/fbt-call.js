import fbt from 'fbt';

function Component(props) {
  const text = fbt(
    `${fbt.param('(key) count', props.count)} items`,
    '(description) Number of items'
  );
  return <div>{text}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{count: 2}],
};
