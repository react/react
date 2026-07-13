// @validateExhaustiveEffectDependencies:"extra-only"
import {useEffect} from 'react';

function Component({x, y, z}) {
  // no error: missing dep not reported in extra-only mode
  useEffect(() => {
    log(x);
  }, []);

  // error: extra dep - y
  useEffect(() => {
    log(x);
  }, [x, y]);

  // error: extra dep - y (missing dep - z not reported)
  useEffect(() => {
    log(x, z);
  }, [x, y]);

  // error: extra dep - x.y
  useEffect(() => {
    log(x);
  }, [x.y]);
}
