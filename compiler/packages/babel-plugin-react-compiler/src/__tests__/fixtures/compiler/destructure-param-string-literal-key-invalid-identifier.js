function foo({'data-foo-bar': dataTestID}) {
  return dataTestID;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{'data-foo-bar': {}}],
  isComponent: false,
};
