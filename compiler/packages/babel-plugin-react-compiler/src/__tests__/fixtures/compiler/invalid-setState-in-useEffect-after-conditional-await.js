// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component({delay}) {
  const [ready, setReady] = useState(false);
  const load = async () => {
    if (delay) {
      await Promise.resolve();
    }
    // The path where `delay` is false reaches this setState without passing an
    // await, so it can still execute synchronously within the effect: flag it.
    setReady(true);
  };
  useEffect(() => {
    load();
  }, [load]);
  return ready ? 'Ready' : 'Loading';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{delay: false}],
};
