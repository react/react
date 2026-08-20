// @enableTreatRefLikeIdentifiersAsRefs @validatePreserveExistingMemoizationGuarantees
import {useRef, useCallback} from 'react';

function useCustomRef() {
  return useRef({click: () => {}});
}

function Foo() {
  const customRef = useCustomRef();

  const onClick = useCallback(() => {
    customRef.current?.click();
  }, [customRef]);

  return <button onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
  isComponent: true,
};
