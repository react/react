// @enableTreatRefLikeIdentifiersAsRefs @validateRefAccessDuringRender

import {useRef} from 'react';

function Component() {
  const ref = useRef(null);
  const ref2 = useRef(null);
  const mergedRef = mergeRefs([ref], ref2);

  return <Stringify ref={mergedRef} />;
}
