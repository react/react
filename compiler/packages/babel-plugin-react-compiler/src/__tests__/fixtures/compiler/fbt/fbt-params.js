import fbt from 'fbt';

function Component(props) {
  return (
    <div>
      <fbt desc={'Dialog to show to user'}>
        Hello <fbt:param name="user name">{props.name}</fbt:param>
      </fbt>
      <fbt desc={'Available actions|response'}>
        <fbt:param name="actions|response">{props.actions}</fbt:param>
      </fbt>
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
