function Component() {
  // prettier-ignore
  return (
    <div
      className="
        first second
        third
      "
      title="first
second"
      data-spaces="first  second"
      data-expression={'first\n  second'}>
      <Child value="
        first
        second
      " />
    </div>
  );
}

function Child({value}) {
  return <span>{value}</span>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
