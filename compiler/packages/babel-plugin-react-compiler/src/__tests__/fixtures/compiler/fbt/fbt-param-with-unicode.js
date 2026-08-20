import fbt from 'fbt';

function Component(props) {
  const element = (
    <fbt desc={'Dialog to show to user'}>
      Hello <fbt:param name="user name ☺">{props.name}</fbt:param>
    </fbt>
  );
  return element.toString();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Jason'}],
};
