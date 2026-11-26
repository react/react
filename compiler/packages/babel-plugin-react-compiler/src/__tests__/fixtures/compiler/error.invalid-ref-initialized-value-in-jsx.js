// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({fallback}) {
  const snapshot = useRef(null);
  snapshot.current ??= {value: fallback};
  const source = snapshot;
  return <output>{source['current'].value}</output>;
}
