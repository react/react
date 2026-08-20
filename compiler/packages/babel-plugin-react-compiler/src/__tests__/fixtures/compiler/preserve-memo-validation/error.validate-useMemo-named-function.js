// @validatePreserveExistingMemoizationGuarantees

// We technically do not need to bailout here if we can check
// `someHelper`'s reactive deps are a subset of depslist from
// source. This check is somewhat incompatible with our current
// representation of manual memoization in HIR, so we bail out
// for now.
function Component(props) {
  const x = useMemo(someHelper, []);
  return x;
}
