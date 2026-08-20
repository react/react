import {useCallback, useEffect, useState} from 'react';

function Component() {
  const callback = useCallback(() => {
    window.foo = true;
  }, []);

  return <div>Ok</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
