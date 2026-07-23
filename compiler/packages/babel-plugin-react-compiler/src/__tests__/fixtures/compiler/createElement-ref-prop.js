import React, {useRef} from 'react';

function refInHtmlElement() {
  const ref = useRef(null);
  return React.createElement('canvas', {ref});
}

export const FIXTURE_ENTRYPOINT = {
  fn: refInHtmlElement,
  params: [],
};
