// @flow @compilationMode:"infer"
export default hook useFoo(bar: number) {
  return [bar];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [42],
};
