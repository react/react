function Component({condition}) {
  let positiveZero;
  let negativeZero;
  let nonzero;
  let nan;
  if (condition) {
    positiveZero = 0;
    negativeZero = -0;
    nonzero = 42;
    nan = 0 / 0;
  } else {
    positiveZero = 0;
    negativeZero = -0;
    nonzero = 42;
    nan = 0 / 0;
  }
  return (
    <div>
      {1 / positiveZero},{1 / negativeZero},{nonzero},{`${nan}`},{`${0 === -0}`}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{condition: true}],
  sequentialRenders: [{condition: true}, {condition: false}, {condition: true}],
};
