// @validateExhaustiveEffectDependencies:"all"
import {useEffect, useEffectEvent} from 'react';

function Component({x, y, z}) {
  const effectEvent = useEffectEvent(() => {
    log(x);
  });

  const effectEvent2 = useEffectEvent(z => {
    log(y, z);
  });

  // error - do not include effect event in deps
  useEffect(() => {
    effectEvent();
  }, [effectEvent]);

  // error - do not include effect event in deps
  useEffect(() => {
    effectEvent2(z);
  }, [effectEvent2, z]);

  // error - do not include effect event captured values in deps
  useEffect(() => {
    effectEvent2(z);
  }, [y, z]);
}
