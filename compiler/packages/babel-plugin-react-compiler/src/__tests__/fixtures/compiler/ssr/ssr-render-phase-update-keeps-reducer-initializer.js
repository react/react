// @outputMode:"ssr"
import {useEffect, useReducer, useState} from 'react';

function reducer(state, action) {
  return action;
}

function Component() {
  // React calls the initializer only on the first render pass. The render-phase
  // update changes `json`, so inlining `JSON.parse(json)` would throw on the
  // second pass. The hook is kept even though only an effect reads its state.
  const [json, setJson] = useState('{}');
  const [config] = useReducer(reducer, json, JSON.parse);
  useEffect(() => {
    document.title = String(config.title);
  }, [config]);
  if (json === '{}') {
    setJson('not json');
  }
  return <div>{json}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
