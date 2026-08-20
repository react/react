import fbt from 'fbt';
import {Stringify} from 'shared-runtime';

function Component(props) {
  const label = fbt(
    fbt.plural('bar', props.value.length, {
      many: 'bars',
      showCount: 'yes',
    }),
    'The label text'
  );
  return props.cond ? (
    <Stringify
      description={<fbt desc="Some text">Text here</fbt>}
      label={label.toString()}
    />
  ) : null;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true, value: [0, 1, 2]}],
};
