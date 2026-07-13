// @validateNoSetStateInEffects @enableVerboseNoSetStateInEffect
import {useState, useEffect} from 'react';

const externalStore = {
  value: 0,
  subscribe(callback) {
    return () => {};
  },
  getValue() {
    return this.value;
  },
};

function ExternalDataComponent() {
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const unsubscribe = externalStore.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);
  return <div>{externalStore.getValue()}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: ExternalDataComponent,
  params: [],
};
