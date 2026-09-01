// @flow @enableTreatRefLikeIdentifiersAsRefs @validateRefAccessDuringRender
import {makeObject_Primitives} from 'shared-runtime';

component Example() {
  const fooRef = makeObject_Primitives();
  fooRef.current = true;

  return <Stringify foo={fooRef} />;
}
