// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState, useRef} from 'react';

export default function Component({test}) {
  const [local, setLocal] = useState('');

  const myRef = useRef(null);

  useEffect(() => {
    setLocal(myRef.current + test);
  }, [test]);

  return <>{local}</>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{test: 'testString'}],
};
