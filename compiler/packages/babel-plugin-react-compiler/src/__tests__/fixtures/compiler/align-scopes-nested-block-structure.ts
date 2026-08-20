import {mutate} from 'shared-runtime';
/**
 * Fixture showing that it's not sufficient to only align direct scoped
 * accesses of a block-fallthrough pair.
 * Below is a simplified view of HIR blocks in this fixture.
 * Note that here, s is mutated in both bb1 and bb4. However, neither
 * bb1 nor bb4 have terminal fallthroughs or are fallthroughs themselves.
 *
 * This means that we need to recursively visit all scopes accessed between
 * a block and its fallthrough and extend the range of those scopes which overlap
 * with an active block/fallthrough pair,
 *
 *  bb0
 *  ┌──────────────┐
 *  │let s = null  │
 *  │test cond1    │
 *  │ <fallthr=bb3>│
 *  └┬─────────────┘
 *   │  bb1
 *   ├─►┌───────┐
 *   │  │s = {} ├────┐
 *   │  └───────┘    │
 *   │  bb2          │
 *   └─►┌───────┐    │
 *      │return;│    │
 *      └───────┘    │
 *  bb3              │
 *  ┌──────────────┐◄┘
 *  │test cond2    │
 *  │ <fallthr=bb5>│
 *  └┬─────────────┘
 *   │  bb4
 *   ├─►┌─────────┐
 *   │  │mutate(s)├─┐
 *   ▼  └─────────┘ │
 *  bb5             │
 *  ┌───────────┐   │
 *  │return s;  │◄──┘
 *  └───────────┘
 */
function useFoo({cond1, cond2}) {
  let s = null;
  if (cond1) {
    s = {};
  } else {
    return null;
  }

  if (cond2) {
    mutate(s);
  }

  return s;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{cond1: true, cond2: false}],
  sequentialRenders: [
    {cond1: true, cond2: false},
    {cond1: true, cond2: false},
    {cond1: true, cond2: true},
    {cond1: true, cond2: true},
    {cond1: false, cond2: true},
  ],
};
