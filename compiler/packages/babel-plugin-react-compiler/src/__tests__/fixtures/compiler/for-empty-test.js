function Component(props) {
  let index = 0;
  let total = 0;

  for (;;) {
    index++;
    if (index < props.start) {
      continue;
    }
    total += index;
    if (index >= props.end) {
      break;
    }
  }

  return total;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{start: 2, end: 4}],
  isComponent: true,
};
