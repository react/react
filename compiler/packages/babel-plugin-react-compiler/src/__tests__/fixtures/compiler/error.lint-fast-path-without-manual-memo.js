// @loggerTestOnly @validateRefAccessDuringRender @outputMode:"lint" @enableLintFastPath
import {useRef} from 'react';

/**
 * Functions without manual memoization stop compiling after the last
 * validation pass, and still report validation errors.
 */
function Component(props) {
  const ref = useRef(null);
  const value = ref.current;
  return <div>{value}</div>;
}
