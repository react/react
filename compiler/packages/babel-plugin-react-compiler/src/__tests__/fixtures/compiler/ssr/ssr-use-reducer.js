// @outputMode:"ssr"

import {useReducer} from 'react';

function Component() {
  const [state, dispatch] = useReducer((_, next) => next, 0);
  const ref = useRef(null);
  const onChange = e => {
    dispatch(e.target.value);
  };
  useEffect(() => {
    log(ref.current.value);
  });
  return <input value={state} onChange={onChange} ref={ref} />;
}
