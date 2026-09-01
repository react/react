// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import {useCallback, useRef} from 'react';

function useCustomRef() {
  return useRef({click: () => {}});
}

function Foo() {
  const notaref = useCustomRef();

  const onClick = useCallback(() => {
    notaref.current?.click();
  }, []);

  return <button onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
  isComponent: true,
};
