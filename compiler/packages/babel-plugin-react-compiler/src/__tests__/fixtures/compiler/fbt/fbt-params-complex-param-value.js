import fbt from 'fbt';

function Component(props) {
  return (
    <fbt desc={'Dialog to show to user'}>
      Hello <fbt:param name="user name">{capitalize(props.name)}</fbt:param>
    </fbt>
  );
}
