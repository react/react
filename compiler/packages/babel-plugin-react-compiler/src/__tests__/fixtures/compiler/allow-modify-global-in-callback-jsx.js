// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';

const someGlobal = {value: 0};

function Component({value}) {
  const onClick = () => {
    someGlobal.value = value;
  };
  return useMemo(() => {
    return <div onClick={onClick}>{someGlobal.value}</div>;
  }, []);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 0}],
  sequentialRenders: [
    {value: 1},
    {value: 1},
    {value: 42},
    {value: 42},
    {value: 0},
  ],
};
