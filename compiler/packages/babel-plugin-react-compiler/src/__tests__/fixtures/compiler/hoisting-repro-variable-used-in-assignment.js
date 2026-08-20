function get2() {
  const callbk = () => {
    const copy = x;
    return copy;
  };
  const x = 2;
  return callbk();
}

export const FIXTURE_ENTRYPOINT = {
  fn: get2,
  params: [],
};
