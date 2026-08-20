import fbt from 'fbt';
import {Stringify} from 'shared-runtime';

export function Component(props) {
  let count = 0;
  if (props.items) {
    count = props.items.length;
  }
  return (
    <Stringify>
      {fbt(
        `for ${fbt.param('count', count)} experiences`,
        `Label for the number of items`,
        {project: 'public'}
      )}
    </Stringify>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [1, 2, 3]}],
};
