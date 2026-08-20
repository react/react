// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component() {
  const ref = useRef(null);

  const setRef = () => {
    if (ref.current !== null) {
      ref.current = '';
    }
  };

  const onClick = () => {
    setRef();
  };

  return (
    <>
      <input ref={ref} />
      <button onClick={onClick} />
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
