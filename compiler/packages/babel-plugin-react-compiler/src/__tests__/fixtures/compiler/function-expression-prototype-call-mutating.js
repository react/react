import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component(props) {
  const a = useMemo(() => {
    const a = [];
    const f = function () {
      a.push(props.name);
    };
    f.call();
    return a;
  }, [props.name]);
  return <ValidateMemoization inputs={[props.name]} output={a} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Jason'}],
  sequentialRenders: [{name: 'Lauren'}, {name: 'Lauren'}, {name: 'Jason'}],
};
