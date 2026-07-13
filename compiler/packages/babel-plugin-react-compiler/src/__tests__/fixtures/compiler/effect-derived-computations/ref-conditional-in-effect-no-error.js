// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState, useRef} from 'react';

export default function Component({test}) {
  const [local, setLocal] = useState(0);

  const myRef = useRef(null);

  useEffect(() => {
    if (myRef.current) {
      setLocal(test);
    } else {
      setLocal(test + test);
    }
  }, [test]);

  return <>{local}</>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{test: 4}],
};
