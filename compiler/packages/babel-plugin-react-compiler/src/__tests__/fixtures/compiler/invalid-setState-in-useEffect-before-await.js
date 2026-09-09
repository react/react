// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component({id}) {
  const [state, setState] = useState(0);
  useEffect(async () => {
    setState(s => s + 1);
    await fetchData(id);
  }, [id]);
  return state;
}
