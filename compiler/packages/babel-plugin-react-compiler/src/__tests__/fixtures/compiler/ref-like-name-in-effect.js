// @enableTreatRefLikeIdentifiersAsRefs @validatePreserveExistingMemoizationGuarantees
import {useRef, useEffect} from 'react';

function useCustomRef() {
  return useRef({click: () => {}});
}

function Foo() {
  const ref = useCustomRef();

  useEffect(() => {
    ref.current?.click();
  }, []);

  return <div>foo</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
  isComponent: true,
};
