// @validatePreserveExistingMemoizationGuarantees
import * as React from 'react';

function Component(options = {}) {
  const {skip} = options;

  const recreate = () => (skip ? undefined : {});

  let [observable, setObservable] = React.useState(
    options.skip ? null : recreate
  );

  const recreateRef = React.useRef(recreate);
  React.useLayoutEffect(() => {
    recreateRef.current = recreate;
  });

  if (!skip && !observable) {
    setObservable((observable = recreate()));
  }

  const restart = React.useCallback(() => {
    if (observable) {
      setObservable(recreateRef.current());
    }
  }, [observable]);

  return React.useMemo(() => ({restart}), [restart]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
