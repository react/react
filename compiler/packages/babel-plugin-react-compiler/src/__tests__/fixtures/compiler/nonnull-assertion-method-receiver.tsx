import {Stringify} from 'shared-runtime';

function Component({receiver}) {
  return (
    <Stringify
      direct={receiver.method!()}
      computed={receiver['method']!!()}
      optional={receiver.method!?.()}
      optionalReceiver={receiver?.method!()}
      tagged={receiver.tag!`value`}
    />
  );
}

const receiver = {
  value: 42,
  method() {
    return this.value;
  },
  tag() {
    return this.value;
  },
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{receiver}],
};
