// @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies @enablePropagateDepsInHIR
import {identity, ValidateMemoization} from 'shared-runtime';
import {useMemo} from 'react';

function Component({arg}) {
  const data = useMemo(() => {
    return arg?.items.edges?.nodes.map(identity);
  }, [arg?.items.edges?.nodes]);
  return (
    <ValidateMemoization inputs={[arg?.items.edges?.nodes]} output={data} />
  );
}
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{arg: null}],
  sequentialRenders: [
    {arg: null},
    {arg: null},
    {arg: {items: {edges: null}}},
    {arg: {items: {edges: null}}},
    {arg: {items: {edges: {nodes: [1, 2, 'hello']}}}},
    {arg: {items: {edges: {nodes: [1, 2, 'hello']}}}},
  ],
};
