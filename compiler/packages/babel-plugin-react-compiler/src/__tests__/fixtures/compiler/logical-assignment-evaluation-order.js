import {Stringify} from 'shared-runtime';

function Component() {
  const action = () => {
    const calls = [];
    const target = {x: 0, y: null, z: 1, full: 1};
    function before() {
      calls.push('before');
      return calls.length;
    }
    function getObject(name) {
      calls.push(name);
      return target;
    }
    function key() {
      calls.push('key');
      return 'y';
    }
    function rhs() {
      calls.push('rhs');
      return 7;
    }
    function consume(first, second) {
      calls.push('consume');
      return [first, second];
    }
    const property = consume(before(), (getObject('property').x ||= rhs()));
    const computed = consume(
      before(),
      (getObject('computed')[key()] ??= rhs())
    );
    const binary = before() + (getObject('binary').z &&= rhs());
    const skipped = consume(before(), (getObject('skip').full ||= rhs()));
    return {calls, property, computed, binary, skipped, target};
  };
  return <Stringify action={action} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
