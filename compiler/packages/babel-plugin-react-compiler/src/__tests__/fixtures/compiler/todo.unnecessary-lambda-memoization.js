function Component(props) {
  const data = useFreeze(); // assume this returns {items: Array<{...}>}
  // In this call `data` and `data.items` have a read effect *and* the lambda itself
  // is readonly (it doesn't capture ony mutable references). Further, we ca
  // theoretically determine that the lambda doesn't need to be memoized, since
  // data.items is an Array and Array.prototype.map does not capture its input (callback)
  // in the return value.
  // An observation is that even without knowing the exact type of `data`, if we know
  // that it is a plain, readonly javascript object, then we can infer that any `.map()`
  // calls *must* be Array.prototype.map (or else they are a runtime error), since no
  // other builtin has a .map() function.
  const items = data.items.map(item => <Item item={item} />);
  return <div>{items}</div>;
}
