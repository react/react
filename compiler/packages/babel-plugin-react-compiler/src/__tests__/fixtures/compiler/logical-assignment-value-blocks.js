import {Stringify} from 'shared-runtime';

function Component({flag}) {
  const target = {or: 0, and: 1, nullish: null};
  const calls = [];
  function getObject(name) {
    calls.push(name);
    return target;
  }
  function key() {
    calls.push('key');
    return 'and';
  }
  const logical = flag && (getObject('logical').or ||= 1);
  const conditional = flag ? (getObject('conditional')[key()] &&= 2) : 0;
  const nested = (getObject('outer').nullish ??= getObject('inner').or ||= 3);
  return (
    <Stringify
      target={target}
      calls={calls}
      logical={logical}
      conditional={conditional}
      nested={nested}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{flag: false}],
  sequentialRenders: [{flag: false}, {flag: true}, {flag: true}],
};
