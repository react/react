// @enableTreatRefLikeIdentifiersAsRefs @validateRefAccessDuringRender

import {useRef} from 'react';

function Component(props) {
  const ref = useRef(null);

  return <Foo>{props.render(ref)}</Foo>;
}
