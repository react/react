// @flow @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';
import {useFragment} from 'shared-runtime';

function Component() {
  const data = useFragment();
  const nodes = data.nodes ?? [];
  const flatMap = nodes.flatMap(node => node.items);
  const filtered = flatMap.filter(item => item != null);
  const map = useMemo(() => filtered.map(), [filtered]);
  const index = filtered.findIndex(x => x === null);

  return (
    <div>
      {map}
      {index}
    </div>
  );
}
