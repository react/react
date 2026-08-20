import {fbt} from 'fbt';
import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component({data}) {
  const el = useMemo(
    () => (
      <fbt desc="user name">
        <fbt:param name="name">{data.name ?? ''}</fbt:param>
      </fbt>
    ),
    [data.name]
  );
  return <ValidateMemoization inputs={[data.name]} output={el} />;
}

const props1 = {data: {name: 'Mike'}};
const props2 = {data: {name: 'Mofei'}};
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [props1],
  sequentialRenders: [props1, props2, props2, props1, {...props1}],
};
