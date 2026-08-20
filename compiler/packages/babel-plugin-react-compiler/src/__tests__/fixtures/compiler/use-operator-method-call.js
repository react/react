import {ValidateMemoization} from 'shared-runtime';
import {useMemo} from 'react';
import * as React from 'react';

const FooContext = React.createContext(null);
function Component(props) {
  return (
    <FooContext.Provider value={props.value}>
      <Inner />
    </FooContext.Provider>
  );
}

function Inner(props) {
  const input = React.use(FooContext);
  const output = useMemo(() => [input], [input]);
  return <ValidateMemoization inputs={[input]} output={output} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
  sequentialRenders: [
    {value: null},
    {value: 42},
    {value: 42},
    {value: null},
    {value: null},
    {value: 42},
    {value: null},
    {value: 42},
    {value: null},
  ],
};
