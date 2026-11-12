// @outputMode:"ssr"
import {useState} from 'react';

function Component() {
  // A render-phase update re-renders the component with its existing state, so
  // `snapshot` keeps its value from the first render. Inlining it would
  // recompute it from the updated `ready`, so neither state is inlined.
  const [ready, setReady] = useState(false);
  const [snapshot] = useState({ready});
  if (!ready) {
    setReady(true);
  }
  return <div>{String(snapshot.ready)}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
