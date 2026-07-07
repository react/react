import {Stringify} from 'shared-runtime';

/**
 * A JSX tag written as an identifier (`<Comp />`) refers to the *value* of the
 * identifier. When that value aliases a lowercase global (here `tag`), the
 * compiler must not inline the tag down to `<tag />`, which JSX would reinterpret
 * as a host element named "tag" rather than a reference to the value.
 *
 * The tag must be preserved as a reference (emitted as a promoted `T0` variable).
 *
 * Repro for https://github.com/facebook/react/issues/35268
 */
const tag = Stringify;

function Component(props) {
  const Comp = tag;
  return <Comp {...props} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{id: 42}],
};
