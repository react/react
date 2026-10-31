// @outputMode:"ssr"
import {useEffect, useReducer} from 'react';

function reducer(state, action) {
  return action;
}

// Throws the same message on every JavaScript engine, unlike JSON.parse
function parseConfig(json) {
  if (!json.endsWith('}')) {
    throw new Error('Malformed config');
  }
  return JSON.parse(json);
}

function Component({json}) {
  // The state is only read by an effect, which SSR removes. The initializer
  // still runs during render, and throws for a malformed config.
  const [config] = useReducer(reducer, json, parseConfig);
  useEffect(() => {
    document.title = String(config.title);
  }, [config]);
  return <div>ok</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{json: '{'}],
};
