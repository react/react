// @compilationMode:"infer"
import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component(props) {
  const x = useMemo(() => props.x(), [props.x]);
  return <ValidateMemoization inputs={[props.x]} output={x} />;
}

const f = () => ['React'];
const g = () => ['Compiler'];
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: () => ['React']}],
  sequentialRenders: [{x: f}, {x: g}, {x: g}, {x: f}],
};
