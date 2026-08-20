// @outputMode:"ssr"

import {useReducer} from 'react';

const initializer = x => x;

function Component() {
  const [state, dispatch] = useReducer((_, next) => next, 0, initializer);
  const ref = useRef(null);
  const onChange = e => {
    dispatch(e.target.value);
  };
  useEffect(() => {
    log(ref.current.value);
  });
  return <input value={state} onChange={onChange} ref={ref} />;
}
