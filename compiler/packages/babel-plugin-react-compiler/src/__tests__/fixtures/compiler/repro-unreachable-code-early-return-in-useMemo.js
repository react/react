// @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
import {useMemo, useState} from 'react';
import {ValidateMemoization, identity} from 'shared-runtime';

function Component({value}) {
  const result = useMemo(() => {
    if (value == null) {
      return null;
    }
    try {
      return {value};
    } catch (e) {
      return null;
    }
  }, [value]);
  return <ValidateMemoization inputs={[value]} output={result} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: null}],
  sequentialRenders: [
    {value: null},
    {value: null},
    {value: 42},
    {value: 42},
    {value: null},
    {value: 42},
    {value: null},
    {value: 42},
  ],
};
