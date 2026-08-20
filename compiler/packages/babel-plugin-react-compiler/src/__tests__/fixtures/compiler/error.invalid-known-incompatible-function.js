import {knownIncompatible} from 'ReactCompilerKnownIncompatibleTest';

function Component() {
  const data = knownIncompatible();
  return <div>Error</div>;
}
