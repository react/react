import {useMemo as myMemo} from 'react';

function Component({x}) {
  const v = myMemo(() => x * 2, [x]);
  return <div>{v}</div>;
}
