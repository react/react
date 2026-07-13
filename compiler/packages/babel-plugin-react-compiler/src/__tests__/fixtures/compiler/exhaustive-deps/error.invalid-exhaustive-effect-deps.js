// @validateExhaustiveEffectDependencies:"all"
import {useEffect} from 'react';

function Component({x, y, z}) {
  // error: missing dep - x
  useEffect(() => {
    log(x);
  }, []);

  // error: extra dep - y
  useEffect(() => {
    log(x);
  }, [x, y]);

  // error: missing dep - z; extra dep - y
  useEffect(() => {
    log(x, z);
  }, [x, y]);

  // error: missing dep x
  useEffect(() => {
    log(x);
  }, [x.y]);
}
