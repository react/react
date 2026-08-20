function Component(props) {
  const [y, ...{z}] = props.value;
  return [y, z];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: ['y', {z: 'z!'}]}],
};
