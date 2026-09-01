import {useKnownIncompatible} from 'ReactCompilerKnownIncompatibleTest';

function Component() {
  const data = useKnownIncompatible();
  return <div>Error</div>;
}
