// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component() {
  const ref = useRef(null);

  const onClick = () => {
    if (ref.current !== null) {
      ref.current.value = '';
    }
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
