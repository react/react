function MyApp(props) {
  let res;
  if (props.cond) {
    return;
  } else {
    res = 1;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
