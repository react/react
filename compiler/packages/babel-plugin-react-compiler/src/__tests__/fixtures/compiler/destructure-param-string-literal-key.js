function foo({data: dataTestID}) {
  return dataTestID;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{data: {}}],
  isComponent: false,
};
