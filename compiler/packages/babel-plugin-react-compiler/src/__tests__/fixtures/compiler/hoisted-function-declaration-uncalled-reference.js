import {Stringify} from 'shared-runtime';

function Component({value}) {
  const unused = () => getValue();
  function getValue() {
    return value;
  }
  return <Stringify getValue={getValue} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 1}],
  sequentialRenders: [{value: 1}, {value: 1}, {value: 2}],
};
