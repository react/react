import fbt from 'fbt';
import {identity} from 'shared-runtime';

function Component(props) {
  const text = fbt(
    `Hello, ${fbt.param('(key) name', identity(props.name))}!`,
    '(description) Greeting'
  );
  return <div>{text}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Sathya'}],
};
