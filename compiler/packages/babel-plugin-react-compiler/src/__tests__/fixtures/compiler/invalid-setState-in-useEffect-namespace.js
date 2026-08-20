// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import * as React from 'react';

function Component() {
  const [state, setState] = React.useState(0);
  React.useEffect(() => {
    setState(s => s + 1);
  });
  return state;
}
