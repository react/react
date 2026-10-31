// @outputMode:"ssr"
import {useState} from 'react';

function Component() {
  // React supports setting state during render, including during SSR, so the
  // state is not inlined
  const [ready, setReady] = useState(false);
  if (!ready) {
    setReady(true);
  }
  return <div>{String(ready)}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
