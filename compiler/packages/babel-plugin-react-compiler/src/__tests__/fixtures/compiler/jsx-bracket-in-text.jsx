function Test() {
  return (
    <div>
      If the string contains the string &#123;pageNumber&#125; it will be
      replaced by the page number.
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [],
};
