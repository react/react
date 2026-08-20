import fbt from 'fbt';
import {identity} from 'shared-runtime';

function Component(props) {
  return (
    <Foo
      value={
        <fbt desc="Description of the parameter">
          <fbt:param name="value">{<>{identity(props.text)}</>}</fbt:param>%
        </fbt>
      }
    />
  );
}
