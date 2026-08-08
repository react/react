function Component({test}: {test: null | {value: string}}) {
  return (
    <button disabled={!test} onClick={() => console.log(test!.value)}>
      Print
    </button>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{test: null}],
};
