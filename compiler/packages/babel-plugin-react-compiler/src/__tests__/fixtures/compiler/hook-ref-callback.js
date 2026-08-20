import {useEffect, useRef} from 'react';

function Component(props) {
  const ref = useRef();
  useFoo(() => {
    ref.current = 42;
  });
}

function useFoo(x) {}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
