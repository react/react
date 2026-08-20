function Component(props) {
  let x = [0, 1, 2, 3];
  do {
    if (x === 0) {
      break;
    }
    mutate(x);
  } while (props.cond);
  return x;
}
