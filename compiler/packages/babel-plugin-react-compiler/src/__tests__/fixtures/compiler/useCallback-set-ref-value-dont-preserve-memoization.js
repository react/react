// @enablePreserveExistingMemoizationGuarantees
import {useCallback, useRef} from 'react';

function Component(props) {
  const ref = useRef(null);

  const onChange = useCallback(event => {
    // The ref should still be mutable here even though function deps are frozen in
    // @enablePreserveExistingMemoizationGuarantees mode
    ref.current = event.target.value;
  });

  return <input onChange={onChange} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
