import {useRef} from 'react';

export function Component() {
  const 한글Ref = useRef(0);
  return (
    <div
      onClick={() => {
        한글Ref.current += 1;
      }}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
