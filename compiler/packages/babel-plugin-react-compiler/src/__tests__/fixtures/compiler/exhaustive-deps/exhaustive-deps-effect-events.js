// @validateExhaustiveEffectDependencies:"all"
import {useEffect, useEffectEvent} from 'react';

function Component({x, y, z}) {
  const effectEvent = useEffectEvent(() => {
    log(x);
  });

  const effectEvent2 = useEffectEvent(z => {
    log(y, z);
  });

  // ok - effectEvent not included in deps
  useEffect(() => {
    effectEvent();
  }, []);

  // ok - effectEvent2 not included in deps, z included
  useEffect(() => {
    effectEvent2(z);
  }, [z]);
}
