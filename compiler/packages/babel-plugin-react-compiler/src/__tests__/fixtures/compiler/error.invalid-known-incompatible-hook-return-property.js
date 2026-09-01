import {useKnownIncompatibleIndirect} from 'ReactCompilerKnownIncompatibleTest';

function Component() {
  const {incompatible} = useKnownIncompatibleIndirect();
  return <div>{incompatible()}</div>;
}
