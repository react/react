// @validatePreserveExistingMemoizationGuarantees
import {useCallback} from 'react';

function Component({obj}) {
  const onClick = useCallback(() => {
    if (obj?.id) {
      console.log(obj.id);
    }
  }, [obj?.id]);
  return <button onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{obj: {id: 42}}],
};
