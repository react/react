import {Stringify} from 'shared-runtime';

function foo() {
  const nt = new.target;
  return <Stringify value={nt} />;
}
