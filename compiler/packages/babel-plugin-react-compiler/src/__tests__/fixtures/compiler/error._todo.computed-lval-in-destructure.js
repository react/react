function Component(props) {
  const computedKey = props.key;
  const {[computedKey]: x} = props.val;

  return x;
}
