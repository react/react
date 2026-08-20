import {useState} from 'react';
function component() {
  let [x, setX] = useState(0);
  const handler = event => setX(event.target.value);
  return <input onChange={handler} value={x} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [],
  isComponent: true,
};
