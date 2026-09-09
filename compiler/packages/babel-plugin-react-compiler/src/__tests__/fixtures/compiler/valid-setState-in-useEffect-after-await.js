// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component({id}) {
  const [state, setState] = useState(0);
  useEffect(async () => {
    await fetchData(id);
    setState(s => s + 1);
  }, [id]);
  return state;
}
