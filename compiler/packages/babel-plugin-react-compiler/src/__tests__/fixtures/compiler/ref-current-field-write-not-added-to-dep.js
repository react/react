import {useRef} from 'react';

function Component() {
  const ref = useRef({text: {value: null}});
  const inputChanged = e => {
    ref.current.text.value = e.target.value;
  };

  return <input onChange={inputChanged} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
