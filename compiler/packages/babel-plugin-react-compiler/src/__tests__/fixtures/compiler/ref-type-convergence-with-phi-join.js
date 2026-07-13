// When phi nodes join Ref types with different ref_ids, the join creates a
// fresh ref_id. The fixpoint equality check must ignore ref_ids on Ref and
// RefValue variants (matching TS tyEqual semantics) so the environment
// stabilizes. Without this, the analysis never converges.

import {useRef} from 'react';

function Component({cond}) {
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const chosen = cond ? ref1 : ref2;
  return <div ref={chosen} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true}],
};
