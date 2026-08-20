import fbt from 'fbt';

function Component(props) {
  return (
    <Foo
      value={
        <fbt desc="Description of the parameter">
          <fbt:param name="value">{'0'}</fbt:param>%
        </fbt>
      }
    />
  );
}
