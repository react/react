import {ValidateMemoization} from 'shared-runtime';
import {use, useMemo} from 'react';

const FooContext = React.createContext(null);
function Component(props) {
  return (
    <FooContext.Provider value={props.value}>
      <Inner cond={props.cond} />
    </FooContext.Provider>
  );
}

function Inner(props) {
  let input = null;
  if (props.cond) {
    input = use(FooContext);
  }
  const output = useMemo(() => [input], [input]);
  return <ValidateMemoization inputs={[input]} output={output} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true, value: 42}],
  sequentialRenders: [
    // change cond true->false
    {cond: true, value: 42},
    {cond: false, value: 42},

    // change value
    {cond: false, value: null},
    {cond: false, value: 42},

    // change cond false->true
    {cond: true, value: 42},

    // change cond true->false, change unobserved value, change cond false->true
    {cond: false, value: 42},
    {cond: false, value: null},
    {cond: true, value: 42},
  ],
};
