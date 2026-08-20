import type {ReactElement} from 'react';

function Component(_props: {}): ReactElement {
  return <div>hello world</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
