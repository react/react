// @validateExhaustiveEffectDependencies:"missing-only"
import {useEffect} from 'react';

function Component({x, y, z}) {
  // error: missing dep - x
  useEffect(() => {
    log(x);
  }, []);

  // no error: extra dep not reported in missing-only mode
  useEffect(() => {
    log(x);
  }, [x, y]);

  // error: missing dep - z (extra dep - y not reported)
  useEffect(() => {
    log(x, z);
  }, [x, y]);

  // error: missing dep x
  useEffect(() => {
    log(x);
  }, [x.y]);
}
