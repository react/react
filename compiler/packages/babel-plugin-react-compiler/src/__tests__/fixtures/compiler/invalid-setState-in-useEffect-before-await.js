// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component() {
  const [ready, setReady] = useState(false);
  const load = async () => {
    setReady(true);
    await Promise.resolve();
  };
  useEffect(() => {
    load();
  }, [load]);
  return ready ? 'Ready' : 'Loading';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
